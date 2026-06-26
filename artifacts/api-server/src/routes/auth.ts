import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { CreateUserBody } from "@workspace/api-zod";
import { requireAuth, requireRole } from "../middlewares/auth";
import { createAuditLog } from "../lib/audit";

const router: IRouter = Router();

// GET /api/auth/me — current user with role from our DB
router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  const [dbUser] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, user.id));
  if (!dbUser) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({
    id: dbUser.id,
    email: dbUser.email,
    name: dbUser.name,
    role: dbUser.role,
    createdAt: dbUser.createdAt,
  });
});

// GET /api/auth/users — list all users (Admin only)
router.get("/auth/users", requireAuth, requireRole("Admin"), async (_req, res): Promise<void> => {
  const users = await db
    .select({
      id: usersTable.id,
      email: usersTable.email,
      name: usersTable.name,
      role: usersTable.role,
      createdAt: usersTable.createdAt,
    })
    .from(usersTable)
    .orderBy(usersTable.name);
  res.json(users);
});

// POST /api/auth/users — create a user (Admin only)
router.post("/auth/users", requireAuth, requireRole("Admin"), async (req, res): Promise<void> => {
  const parsed = CreateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, name, password, role } = parsed.data;

  const [existing] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase()));
  if (existing) {
    res.status(400).json({ error: "Email already in use" });
    return;
  }

  const passwordHash = password ? await bcrypt.hash(password, 10) : "";
  const [newUser] = await db
    .insert(usersTable)
    .values({ email: email.toLowerCase(), name, passwordHash, role })
    .returning({
      id: usersTable.id,
      email: usersTable.email,
      name: usersTable.name,
      role: usersTable.role,
      createdAt: usersTable.createdAt,
    });

  await createAuditLog(req.user!.id, "Create", `Admin created user ${newUser.email} with role ${role}`);
  res.status(201).json(newUser);
});

// POST /api/auth/logout — record audit log (Clerk owns cookie invalidation)
router.post("/auth/logout", requireAuth, async (req, res): Promise<void> => {
  if (req.user) {
    await createAuditLog(req.user.id, "Logout", `User ${req.user.email} logged out`);
  }
  res.json({ message: "Logged out" });
});

export default router;
