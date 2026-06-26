import { pgTable, serial, text, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { expensesTable } from "./expenses";

export const auditActionEnum = pgEnum("audit_action", [
  "Create",
  "Update",
  "Delete",
  "Export",
  "Login",
  "Logout",
]);

export const auditLogsTable = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  expenseId: integer("expense_id").references(() => expensesTable.id),
  action: auditActionEnum("action").notNull(),
  details: text("details"),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAuditLogSchema = createInsertSchema(auditLogsTable).omit({ id: true, timestamp: true });
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogsTable.$inferSelect;
