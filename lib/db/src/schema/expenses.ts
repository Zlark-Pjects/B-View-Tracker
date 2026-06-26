import {
  pgTable,
  serial,
  text,
  numeric,
  date,
  timestamp,
  integer,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const paymentMethodEnum = pgEnum("payment_method", [
  "Cash",
  "BankTransfer",
  "POS",
  "CreditCard",
  "Check",
]);

export const expensesTable = pgTable("expenses", {
  id: serial("id").primaryKey(),
  date: date("date", { mode: "string" }).notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("NGN"),
  vendor: text("vendor").notNull(),
  category: text("category").notNull(),
  department: text("department").notNull(),
  description: text("description").notNull(),
  paymentMethod: paymentMethodEnum("payment_method").notNull(),
  personResponsible: text("person_responsible").notNull(),
  documentUrl: text("document_url"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  createdById: integer("created_by_id")
    .notNull()
    .references(() => usersTable.id),
});

export const insertExpenseSchema = createInsertSchema(expensesTable).omit({
  id: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Expense = typeof expensesTable.$inferSelect;
