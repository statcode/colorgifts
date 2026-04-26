import { Router, type IRouter, type Request, type Response } from "express";
import { loadPublicSettings } from "../lib/settings";

const router: IRouter = Router();

router.get("/settings", async (_req: Request, res: Response): Promise<void> => {
  const settings = await loadPublicSettings();
  res.json(settings);
});

export default router;
