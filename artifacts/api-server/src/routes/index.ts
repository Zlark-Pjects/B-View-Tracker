import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import expensesRouter from "./expenses";
import summariesRouter from "./summaries";
import exportRouter from "./export";
import auditLogsRouter from "./auditLogs";
import configRouter from "./config";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(expensesRouter);
router.use(summariesRouter);
router.use(exportRouter);
router.use(auditLogsRouter);
router.use(configRouter);

export default router;
