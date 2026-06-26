import { Router, type IRouter } from "express";
import { and, gte, lte, isNull, sql } from "drizzle-orm";
import { db, expensesTable } from "@workspace/db";
import { GetSummariesQueryParams } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/summaries", requireAuth, async (req, res): Promise<void> => {
  const parsed = GetSummariesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { period = "monthly", startDate, endDate } = parsed.data;

  const conditions = [isNull(expensesTable.deletedAt)];
  if (startDate) conditions.push(gte(expensesTable.date, startDate));
  if (endDate) conditions.push(lte(expensesTable.date, endDate));
  const where = and(...conditions);

  // Total amount and count
  const [totals] = await db
    .select({
      totalAmount: sql<number>`coalesce(sum(${expensesTable.amount}::numeric), 0)`,
      totalCount: sql<number>`count(*)::int`,
    })
    .from(expensesTable)
    .where(where);

  // By category
  const byCategory = await db
    .select({
      label: expensesTable.category,
      amount: sql<number>`sum(${expensesTable.amount}::numeric)`,
      count: sql<number>`count(*)::int`,
    })
    .from(expensesTable)
    .where(where)
    .groupBy(expensesTable.category)
    .orderBy(sql`sum(${expensesTable.amount}::numeric) desc`);

  // By department
  const byDepartment = await db
    .select({
      label: expensesTable.department,
      amount: sql<number>`sum(${expensesTable.amount}::numeric)`,
      count: sql<number>`count(*)::int`,
    })
    .from(expensesTable)
    .where(where)
    .groupBy(expensesTable.department)
    .orderBy(sql`sum(${expensesTable.amount}::numeric) desc`);

  // By payment method
  const byPaymentMethod = await db
    .select({
      label: expensesTable.paymentMethod,
      amount: sql<number>`sum(${expensesTable.amount}::numeric)`,
      count: sql<number>`count(*)::int`,
    })
    .from(expensesTable)
    .where(where)
    .groupBy(expensesTable.paymentMethod)
    .orderBy(sql`sum(${expensesTable.amount}::numeric) desc`);

  // By period
  let periodFormat: string;
  switch (period) {
    case "daily":
      periodFormat = "YYYY-MM-DD";
      break;
    case "weekly":
      periodFormat = "IYYY-IW";
      break;
    case "yearly":
      periodFormat = "YYYY";
      break;
    default:
      periodFormat = "YYYY-MM";
  }

  const byPeriod = await db
    .select({
      period: sql<string>`to_char(${expensesTable.date}::date, ${periodFormat})`,
      amount: sql<number>`sum(${expensesTable.amount}::numeric)`,
      count: sql<number>`count(*)::int`,
    })
    .from(expensesTable)
    .where(where)
    .groupBy(sql`to_char(${expensesTable.date}::date, ${periodFormat})`)
    .orderBy(sql`to_char(${expensesTable.date}::date, ${periodFormat})`);

  // Recent expenses
  const recentExpenses = await db
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
    })
    .from(expensesTable)
    .where(where)
    .orderBy(sql`${expensesTable.date} desc`)
    .limit(5);

  const totalAmt = Number(totals?.totalAmount ?? 0);

  const withPercentage = <T extends { amount: number; count: number }>(arr: T[]) =>
    arr.map((item) => ({
      ...item,
      amount: Number(item.amount),
      percentage: totalAmt > 0 ? Math.round((Number(item.amount) / totalAmt) * 10000) / 100 : 0,
    }));

  res.json({
    totalAmount: totalAmt,
    totalCount: totals?.totalCount ?? 0,
    currency: "NGN",
    byCategory: withPercentage(byCategory),
    byDepartment: withPercentage(byDepartment),
    byPaymentMethod: withPercentage(byPaymentMethod),
    byPeriod: byPeriod.map((r) => ({ ...r, amount: Number(r.amount) })),
    recentExpenses: recentExpenses.map((r) => ({
      ...r,
      amount: parseFloat(r.amount),
      createdByName: null,
    })),
  });
});

export default router;
