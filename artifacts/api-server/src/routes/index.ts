import { Router, type IRouter } from "express";
import healthRouter from "./health";
import storageRouter from "./storage";
import booksRouter from "./books";
import pagesRouter from "./pages";
import photosRouter from "./photos";
import luluRouter from "./lulu";
import adminRouter from "./admin";
import settingsRouter from "./settings";

const router: IRouter = Router();

router.use(healthRouter);
router.use(storageRouter);
router.use(booksRouter);
router.use(pagesRouter);
router.use(photosRouter);
router.use(luluRouter);
router.use(adminRouter);
router.use(settingsRouter);

export default router;
