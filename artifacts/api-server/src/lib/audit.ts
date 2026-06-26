import { db, auditLogsTable } from "@workspace/db";
import { logger } from "./logger";

type AuditAction = "Create" | "Update" | "Delete" | "Export" | "Login" | "Logout";

export async function createAuditLog(
  userId: number,
  action: AuditAction,
  details?: string,
  expenseId?: number,
): Promise<void> {
  try {
    await db.insert(auditLogsTable).values({
      userId,
      action,
      details: details ?? null,
      expenseId: expenseId ?? null,
    });
  } catch (err) {
    logger.error({ err, userId, action }, "Failed to create audit log");
  }
}
