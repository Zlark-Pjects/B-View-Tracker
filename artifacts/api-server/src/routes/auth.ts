import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { LoginBody, CreateUserBody } from "@workspace/api-zod";
import { signToken, requireAuth, requireRole } from "../middlewares/auth";
import { createAuditLog } from "../lib/audit";

const router: IRouter = Router();

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, password } = parsed.data;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase()));

  if (!user) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const authUser = { id: user.id, email: user.email, name: user.name, role: user.role };
  const token = signToken(authUser);

  await createAuditLog(user.id, "Login", `User ${user.email} logged in`);

  res.json({ token, user: { ...authUser, createdAt: user.createdAt } });
});

router.post("/auth/logout", requireAuth, async (req, res): Promise<void> => {
  if (req.user) {
    await createAuditLog(req.user.id, "Logout", `User ${req.user.email} logged out`);
  }
  res.json({ message: "Logged out successfully" });
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  const [dbUser] = await db.select().from(usersTable).where(eq(usersTable.id, user.id));
  if (!dbUser) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({ id: dbUser.id, email: dbUser.email, name: dbUser.name, role: dbUser.role, createdAt: dbUser.createdAt });
});

router.get("/auth/users", requireAuth, requireRole("Admin"), async (_req, res): Promise<void> => {
  const users = await db.select({
    id: usersTable.id,
    email: usersTable.email,
    name: usersTable.name,
    role: usersTable.role,
    createdAt: usersTable.createdAt,
  }).from(usersTable).orderBy(usersTable.name);

  res.json(users);
});

router.post("/auth/users", requireAuth, requireRole("Admin"), async (req, res): Promise<void> => {
  const parsed = CreateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, name, password, role } = parsed.data;

  const [existing] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, email.toLowerCase()));
  if (existing) {
    res.status(400).json({ error: "Email already in use" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const [newUser] = await db.insert(usersTable).values({
    email: email.toLowerCase(),
    name,
    passwordHash,
    role,
  }).returning({
    id: usersTable.id,
    email: usersTable.email,
    name: usersTable.name,
    role: usersTable.role,
    createdAt: usersTable.createdAt,
  });

  res.status(201).json(newUser);
});

export default router;
