import { type Request, type Response, type NextFunction } from "express";
import { getAuth, createClerkClient } from "@clerk/express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { logger } from "../lib/logger";

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY ?? "",
});

// Simple in-memory cache: clerkUserId → { user, expiresAt }
const userCache = new Map<string, { user: AuthUser; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function resolveUser(clerkUserId: string): Promise<AuthUser | null> {
  // Check cache first
  const cached = userCache.get(clerkUserId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.user;
  }

  // Fetch email from Clerk
  let email: string | undefined;
  let displayName: string | undefined;
  try {
    const clerkUser = await clerkClient.users.getUser(clerkUserId);
    email =
      clerkUser.primaryEmailAddress?.emailAddress ??
      clerkUser.emailAddresses[0]?.emailAddress;
    const first = clerkUser.firstName ?? "";
    const last = clerkUser.lastName ?? "";
    displayName = [first, last].filter(Boolean).join(" ") || undefined;
  } catch (err) {
    logger.warn({ err, clerkUserId }, "Failed to fetch Clerk user");
    return null;
  }

  if (!email) {
    logger.warn({ clerkUserId }, "Clerk user has no email address");
    return null;
  }

  // Look up in our DB by email
  let [dbUser] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase()));

  if (!dbUser) {
    // JIT-provision: new Clerk user gets FinanceOfficer role by default
    const name = displayName ?? email.split("@")[0];
    [dbUser] = await db
      .insert(usersTable)
      .values({
        email: email.toLowerCase(),
        name,
        passwordHash: "", // OAuth users don't have a password
        role: "FinanceOfficer",
      })
      .returning();
    logger.info({ email, role: "FinanceOfficer" }, "JIT-provisioned new user");
  }

  const authUser: AuthUser = {
    id: dbUser.id,
    email: dbUser.email,
    name: dbUser.name,
    role: dbUser.role,
  };

  userCache.set(clerkUserId, { user: authUser, expiresAt: Date.now() + CACHE_TTL_MS });
  return authUser;
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const auth = getAuth(req);
  const clerkUserId = auth?.userId;

  if (!clerkUserId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  resolveUser(clerkUserId)
    .then((user) => {
      if (!user) {
        res.status(401).json({ error: "Could not resolve user account" });
        return;
      }
      req.user = user;
      next();
    })
    .catch((err) => {
      logger.error({ err }, "Error in requireAuth");
      res.status(500).json({ error: "Internal server error" });
    });
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: "Insufficient permissions" });
      return;
    }
    next();
  };
}

/** Invalidate the cache for a user (e.g. after role change) */
export function invalidateUserCache(clerkUserId: string): void {
  userCache.delete(clerkUserId);
}
