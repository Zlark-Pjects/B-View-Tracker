import { Router, type IRouter } from "express";
import { db, categoriesTable, departmentsTable } from "@workspace/db";
import { CreateCategoryBody, CreateDepartmentBody } from "@workspace/api-zod";
import { requireAuth, requireRole } from "../middlewares/auth";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

// Categories
router.get("/config/categories", requireAuth, async (_req, res): Promise<void> => {
  const categories = await db
    .select({ id: categoriesTable.id, name: categoriesTable.name, description: categoriesTable.description, color: categoriesTable.color })
    .from(categoriesTable)
    .orderBy(categoriesTable.name);
  res.json(categories);
});

router.post("/config/categories", requireAuth, requireRole("Admin"), async (req, res): Promise<void> => {
  const parsed = CreateCategoryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db.select({ id: categoriesTable.id }).from(categoriesTable).where(eq(categoriesTable.name, parsed.data.name));
  if (existing) {
    res.status(400).json({ error: "Category already exists" });
    return;
  }

  const [cat] = await db.insert(categoriesTable).values({
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    color: parsed.data.color ?? null,
  }).returning({ id: categoriesTable.id, name: categoriesTable.name, description: categoriesTable.description, color: categoriesTable.color });

  res.status(201).json(cat);
});

// Departments
router.get("/config/departments", requireAuth, async (_req, res): Promise<void> => {
  const departments = await db
    .select({ id: departmentsTable.id, name: departmentsTable.name, description: departmentsTable.description })
    .from(departmentsTable)
    .orderBy(departmentsTable.name);
  res.json(departments);
});

router.post("/config/departments", requireAuth, requireRole("Admin"), async (req, res): Promise<void> => {
  const parsed = CreateDepartmentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db.select({ id: departmentsTable.id }).from(departmentsTable).where(eq(departmentsTable.name, parsed.data.name));
  if (existing) {
    res.status(400).json({ error: "Department already exists" });
    return;
  }

  const [dept] = await db.insert(departmentsTable).values({
    name: parsed.data.name,
    description: parsed.data.description ?? null,
  }).returning({ id: departmentsTable.id, name: departmentsTable.name, description: departmentsTable.description });

  res.status(201).json(dept);
});

export default router;
