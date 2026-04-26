/**
 * Require an authenticated Clerk user. Attaches `userId` to the request.
 *
 * Returns 401 when there is no signed-in user. When CLERK_PUBLISHABLE_KEY is
 * unset (dev fallback), auth is disabled and requests are passed through
 * with `userId` left unset — matching the server startup warning in app.ts.
 */
import type { Request, Response, NextFunction, RequestHandler } from "express";
import { getAuth } from "@clerk/express";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export function requireUser(): RequestHandler {
  const clerkEnabled = !!process.env.CLERK_PUBLISHABLE_KEY;

  return (req: Request, res: Response, next: NextFunction) => {
    if (!clerkEnabled) {
      return next();
    }
    const { userId } = getAuth(req);
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    req.userId = userId;
    next();
  };
}
