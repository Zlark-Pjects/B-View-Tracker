import { Router, type IRouter } from "express";
import { and, eq, sql } from "drizzle-orm";
import { db, auditLogsTable, usersTable } from "@workspace/db";
import { ListAuditLogsQueryParams } from "@workspace/api-zod";
import { requireAuth, requireRole } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/audit-logs", requireAuth, requireRole("Admin", "Auditor"), async (req, res): Promise<void> => {
  const parsed = ListAuditLogsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { expenseId, userId, action, page = 1, limit = 20 } = parsed.data;

  const conditions = [];
  if (expenseId) conditions.push(eq(auditLogsTable.expenseId, expenseId));
  if (userId) conditions.push(eq(auditLogsTable.userId, userId));
  if (action) conditions.push(eq(auditLogsTable.action, action as any));

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const offset = (page - 1) * limit;

  const [countRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(auditLogsTable)
    .where(where);

  const total = countRow?.count ?? 0;

  const rows = await db
    .select({
      id: auditLogsTable.id,
      expenseId: auditLogsTable.expenseId,
      action: auditLogsTable.action,
      details: auditLogsTable.details,
      userId: auditLogsTable.userId,
      userName: usersTable.name,
      timestamp: auditLogsTable.timestamp,
    })
    .from(auditLogsTable)
    .leftJoin(usersTable, eq(auditLogsTable.userId, usersTable.id))
    .where(where)
    .orderBy(sql`${auditLogsTable.timestamp} desc`)
    .limit(limit)
    .offset(offset);

  res.json({
    data: rows,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
});

export default router;
