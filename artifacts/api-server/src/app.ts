import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { CLERK_PROXY_PATH, clerkProxyMiddleware } from "./middlewares/clerkProxyMiddleware";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

// Trust the loopback proxy (Apache/NGINX → 127.0.0.1:8088). Lets req.protocol
// reflect the original `https` from X-Forwarded-Proto, so generated URLs
// (e.g. PDF preview links) use the public scheme + host instead of `http://localhost`.
app.set("trust proxy", "loopback");

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

app.use(cors({ credentials: true, origin: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.CLERK_PUBLISHABLE_KEY) {
  app.use(clerkMiddleware());
} else {
  logger.warn("CLERK_PUBLISHABLE_KEY not set — running without auth");
}

app.use("/api", router);

/**
 * Surface the full error cause chain. Drizzle wraps the raw driver error in
 * a `DrizzleQueryError` whose `message` is just "Failed query: ..." — the
 * real MySQL message lives on `.cause`. Default Express logging only prints
 * the top-level stack, so the driver error is otherwise invisible.
 */
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  const causes: { message: string }[] = [];
  let cur: unknown = err;
  while (cur && typeof cur === "object" && "cause" in cur && (cur as { cause?: unknown }).cause) {
    cur = (cur as { cause: unknown }).cause;
    if (cur instanceof Error) causes.push({ message: cur.message });
  }
  req.log.error({ err, causes }, "Unhandled request error");
  if (!res.headersSent) {
    const rootMessage = causes.at(-1)?.message;
    res.status(500).json({
      error: rootMessage ? `${err.message} — ${rootMessage}` : err.message,
    });
  }
});

export default app;
