import { Router, type IRouter } from "express";
import { eq, and, gte, lte, ilike, isNull, sql } from "drizzle-orm";
import { db, expensesTable, usersTable } from "@workspace/db";
import {
  CreateExpenseBody,
  UpdateExpenseBody,
  GetExpenseParams,
  UpdateExpenseParams,
  DeleteExpenseParams,
  ListExpensesQueryParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { createAuditLog } from "../lib/audit";

const router: IRouter = Router();

router.get("/expenses", requireAuth, async (req, res): Promise<void> => {
  const parsed = ListExpensesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const {
    startDate,
    endDate,
    category,
    department,
    vendor,
    paymentMethod,
    search,
    page = 1,
    limit = 20,
  } = parsed.data;

  const conditions = [isNull(expensesTable.deletedAt)];

  if (startDate) conditions.push(gte(expensesTable.date, startDate));
  if (endDate) conditions.push(lte(expensesTable.date, endDate));
  if (category) conditions.push(eq(expensesTable.category, category));
  if (department) conditions.push(eq(expensesTable.department, department));
  if (paymentMethod) conditions.push(eq(expensesTable.paymentMethod, paymentMethod as any));
  if (vendor) conditions.push(ilike(expensesTable.vendor, `%${vendor}%`));
  if (search) {
    const s = `%${search}%`;
    conditions.push(
      sql`(${ilike(expensesTable.vendor, s)} OR ${ilike(expensesTable.description, s)} OR ${ilike(expensesTable.personResponsible, s)} OR ${ilike(expensesTable.category, s)})`,
    );
  }

  const where = and(...conditions);
  const offset = (page - 1) * limit;

  const [countRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(expensesTable)
    .where(where);

  const total = countRow?.count ?? 0;

  const rows = await db
    .select({
      id: expensesTable.id,
      date: expensesTable.date,
      amount: expensesTable.amount,
      currency: expensesTable.currency,
      vendor: expensesTable.vendor,
      category: expensesTable.category,
      department: expensesTable.department,
      description: expensesTable.description,
      paymentMethod: expensesTable.paymentMethod,
      personResponsible: expensesTable.personResponsible,
      documentUrl: expensesTable.documentUrl,
      deletedAt: expensesTable.deletedAt,
      createdAt: expensesTable.createdAt,
      updatedAt: expensesTable.updatedAt,
      createdById: expensesTable.createdById,
      createdByName: usersTable.name,
    })
    .from(expensesTable)
    .leftJoin(usersTable, eq(expensesTable.createdById, usersTable.id))
    .where(where)
    .orderBy(sql`${expensesTable.date} desc, ${expensesTable.createdAt} desc`)
    .limit(limit)
    .offset(offset);

  const data = rows.map((r) => ({ ...r, amount: parseFloat(r.amount) }));

  res.json({
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
});

router.post("/expenses", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateExpenseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const userId = req.user!.id;

  const [expense] = await db
    .insert(expensesTable)
    .values({
      ...parsed.data,
      createdById: userId,
      documentUrl: parsed.data.documentUrl ?? null,
    })
    .returning();

  await createAuditLog(userId, "Create", `Created expense: ${expense.vendor} - ${expense.amount} ${expense.currency}`, expense.id);

  const [withUser] = await db
    .select({
      id: expensesTable.id,
      date: expensesTable.date,
      amount: expensesTable.amount,
      currency: expensesTable.currency,
      vendor: expensesTable.vendor,
      category: expensesTable.category,
      department: expensesTable.department,
      description: expensesTable.description,
      paymentMethod: expensesTable.paymentMethod,
      personResponsible: expensesTable.personResponsible,
      documentUrl: expensesTable.documentUrl,
      deletedAt: expensesTable.deletedAt,
      createdAt: expensesTable.createdAt,
      updatedAt: expensesTable.updatedAt,
      createdById: expensesTable.createdById,
      createdByName: usersTable.name,
    })
    .from(expensesTable)
    .leftJoin(usersTable, eq(expensesTable.createdById, usersTable.id))
    .where(eq(expensesTable.id, expense.id));

  res.status(201).json({ ...withUser, amount: parseFloat(withUser.amount) });
});

router.get("/expenses/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetExpenseParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [expense] = await db
    .select({
      id: expensesTable.id,
      date: expensesTable.date,
      amount: expensesTable.amount,
      currency: expensesTable.currency,
      vendor: expensesTable.vendor,
      category: expensesTable.category,
      department: expensesTable.department,
      description: expensesTable.description,
      paymentMethod: expensesTable.paymentMethod,
      personResponsible: expensesTable.personResponsible,
      documentUrl: expensesTable.documentUrl,
      deletedAt: expensesTable.deletedAt,
      createdAt: expensesTable.createdAt,
      updatedAt: expensesTable.updatedAt,
      createdById: expensesTable.createdById,
      createdByName: usersTable.name,
    })
    .from(expensesTable)
    .leftJoin(usersTable, eq(expensesTable.createdById, usersTable.id))
    .where(and(eq(expensesTable.id, params.data.id), isNull(expensesTable.deletedAt)));

  if (!expense) {
    res.status(404).json({ error: "Expense not found" });
    return;
  }

  res.json({ ...expense, amount: parseFloat(expense.amount) });
});

router.put("/expenses/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateExpenseParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpdateExpenseBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [existing] = await db
    .select({ id: expensesTable.id })
    .from(expensesTable)
    .where(and(eq(expensesTable.id, params.data.id), isNull(expensesTable.deletedAt)));

  if (!existing) {
    res.status(404).json({ error: "Expense not found" });
    return;
  }

  const updateData: Record<string, unknown> = {};
  const d = body.data;
  if (d.date !== undefined) updateData.date = d.date;
  if (d.amount !== undefined) updateData.amount = d.amount;
  if (d.currency !== undefined) updateData.currency = d.currency;
  if (d.vendor !== undefined) updateData.vendor = d.vendor;
  if (d.category !== undefined) updateData.category = d.category;
  if (d.department !== undefined) updateData.department = d.department;
  if (d.description !== undefined) updateData.description = d.description;
  if (d.paymentMethod !== undefined) updateData.paymentMethod = d.paymentMethod;
  if (d.personResponsible !== undefined) updateData.personResponsible = d.personResponsible;
  if ("documentUrl" in d) updateData.documentUrl = d.documentUrl;

  const [updated] = await db
    .update(expensesTable)
    .set(updateData)
    .where(eq(expensesTable.id, params.data.id))
    .returning();

  await createAuditLog(req.user!.id, "Update", `Updated expense ${params.data.id}`, params.data.id);

  const [withUser] = await db
    .select({
      id: expensesTable.id,
      date: expensesTable.date,
      amount: expensesTable.amount,
      currency: expensesTable.currency,
      vendor: expensesTable.vendor,
      category: expensesTable.category,
      department: expensesTable.department,
      description: expensesTable.description,
      paymentMethod: expensesTable.paymentMethod,
      personResponsible: expensesTable.personResponsible,
      documentUrl: expensesTable.documentUrl,
      deletedAt: expensesTable.deletedAt,
      createdAt: expensesTable.createdAt,
      updatedAt: expensesTable.updatedAt,
      createdById: expensesTable.createdById,
      createdByName: usersTable.name,
    })
    .from(expensesTable)
    .leftJoin(usersTable, eq(expensesTable.createdById, usersTable.id))
    .where(eq(expensesTable.id, updated.id));

  res.json({ ...withUser, amount: parseFloat(withUser.amount) });
});

router.delete("/expenses/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteExpenseParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [existing] = await db
    .select({ id: expensesTable.id })
    .from(expensesTable)
    .where(and(eq(expensesTable.id, params.data.id), isNull(expensesTable.deletedAt)));

  if (!existing) {
    res.status(404).json({ error: "Expense not found" });
    return;
  }

  await db
    .update(expensesTable)
    .set({ deletedAt: new Date() })
    .where(eq(expensesTable.id, params.data.id));

  await createAuditLog(req.user!.id, "Delete", `Soft deleted expense ${params.data.id}`, params.data.id);

  res.json({ message: "Expense deleted successfully" });
});

export default router;
