import { Router, type IRouter } from "express";
import { and, gte, lte, isNull, eq } from "drizzle-orm";
import { db, expensesTable, usersTable } from "@workspace/db";
import { ExportPdfQueryParams, ExportExcelQueryParams } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { createAuditLog } from "../lib/audit";
import path from "path";
import fs from "fs";

const router: IRouter = Router();

function getExportsDir(): string {
  const workspaceRoot = process.cwd().endsWith(path.join("artifacts", "api-server"))
    ? path.resolve(process.cwd(), "../..")
    : process.cwd();
  const dir = path.resolve(workspaceRoot, "artifacts/api-server/exports");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

async function getExpenses(startDate?: string, endDate?: string, category?: string, department?: string) {
  const conditions = [isNull(expensesTable.deletedAt)];
  if (startDate) conditions.push(gte(expensesTable.date, startDate));
  if (endDate) conditions.push(lte(expensesTable.date, endDate));
  if (category) conditions.push(eq(expensesTable.category, category));
  if (department) conditions.push(eq(expensesTable.department, department));

  return db
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
      createdByName: usersTable.name,
    })
    .from(expensesTable)
    .leftJoin(usersTable, eq(expensesTable.createdById, usersTable.id))
    .where(and(...conditions))
    .orderBy(expensesTable.date);
}

router.get("/export/excel", requireAuth, async (req, res): Promise<void> => {
  const parsed = ExportExcelQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { startDate, endDate, category, department } = parsed.data;
  const expenses = await getExpenses(startDate, endDate, category, department);

  // Build CSV (Excel-compatible)
  const headers = ["ID", "Date", "Amount", "Currency", "Vendor", "Category", "Department", "Description", "Payment Method", "Person Responsible", "Created By"];
  const rows = expenses.map((e) => [
    e.id,
    e.date,
    parseFloat(e.amount),
    e.currency,
    `"${e.vendor?.replace(/"/g, '""') ?? ""}"`,
    e.category,
    e.department,
    `"${e.description?.replace(/"/g, '""') ?? ""}"`,
    e.paymentMethod,
    `"${e.personResponsible?.replace(/"/g, '""') ?? ""}"`,
    `"${e.createdByName?.replace(/"/g, '""') ?? ""}"`,
  ]);

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

  const filename = `expenses-${Date.now()}.csv`;
  const exportsDir = getExportsDir();
  const filePath = path.join(exportsDir, filename);
  fs.writeFileSync(filePath, csv, "utf-8");

  await createAuditLog(req.user!.id, "Export", `Exported ${expenses.length} expenses to Excel/CSV`);

  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  res.json({
    downloadUrl: `/api/export/download/${filename}`,
    filename,
    expiresAt: expiresAt.toISOString(),
  });
});

router.get("/export/pdf", requireAuth, async (req, res): Promise<void> => {
  const parsed = ExportPdfQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { startDate, endDate, category, department } = parsed.data;
  const expenses = await getExpenses(startDate, endDate, category, department);

  const total = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);

  // Generate simple HTML-based PDF report as text
  const lines = [
    "B-VIEW EXPENSE TRACKER — EXPENSE REPORT",
    "=========================================",
    `Generated: ${new Date().toLocaleString()}`,
    `Period: ${startDate ?? "All"} to ${endDate ?? "All"}`,
    `Category: ${category ?? "All"}  |  Department: ${department ?? "All"}`,
    `Total Records: ${expenses.length}  |  Total Amount: ${total.toLocaleString()} NGN`,
    "",
    "DATE       | AMOUNT       | CURRENCY | VENDOR                    | CATEGORY         | DEPARTMENT       | PAYMENT METHOD | PERSON RESPONSIBLE",
    "-".repeat(160),
    ...expenses.map((e) =>
      `${e.date} | ${parseFloat(e.amount).toLocaleString().padStart(12)} | ${(e.currency ?? "NGN").padEnd(8)} | ${(e.vendor ?? "").padEnd(25)} | ${(e.category ?? "").padEnd(16)} | ${(e.department ?? "").padEnd(16)} | ${(e.paymentMethod ?? "").padEnd(14)} | ${e.personResponsible ?? ""}`
    ),
    "",
    `TOTAL: ${total.toLocaleString()} NGN`,
  ];

  const content = lines.join("\n");
  const filename = `expenses-report-${Date.now()}.txt`;
  const exportsDir = getExportsDir();
  const filePath = path.join(exportsDir, filename);
  fs.writeFileSync(filePath, content, "utf-8");

  await createAuditLog(req.user!.id, "Export", `Exported ${expenses.length} expenses to PDF report`);

  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  res.json({
    downloadUrl: `/api/export/download/${filename}`,
    filename,
    expiresAt: expiresAt.toISOString(),
  });
});

router.get("/export/download/:filename", requireAuth, (req, res): void => {
  const raw = Array.isArray(req.params.filename) ? req.params.filename[0] : req.params.filename;
  if (!raw || !/^[a-zA-Z0-9._-]+$/.test(raw)) {
    res.status(400).json({ error: "Invalid filename" });
    return;
  }

  const exportsDir = getExportsDir();
  const filePath = path.join(exportsDir, raw);

  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: "File not found or expired" });
    return;
  }

  const isCSV = raw.endsWith(".csv");
  res.setHeader("Content-Type", isCSV ? "text/csv" : "text/plain");
  res.setHeader("Content-Disposition", `attachment; filename="${raw}"`);
  res.sendFile(filePath);
});

export default router;
