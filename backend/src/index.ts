import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import { env } from "./config/env";
import { healthRouter } from "./routes/health";
import { meRouter } from "./routes/me";
import { errorHandler } from "./middleware/error";
// import { startProducer, stopProducer } from "./kafka/producer";
import { profileRouter } from "./routes/display.name";
import { adminRouter } from "./routes/admin";
import { sellerRouter } from "./routes/seller";
import { publicCategoriesRouter } from "./routes/public.categories";

async function main() {
  const app = express();

  app.use(helmet());
  const corsMiddleware = cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      const allowed = [env.FRONTEND_URL].filter(Boolean);
      const norm = (u: string) => u.replace(/\/$/, "");
      const ok = allowed.map(norm).includes(norm(origin));
      if (ok) return cb(null, true);
      return cb(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    maxAge: 86400,
  });
  app.use(corsMiddleware);
  app.options("*", corsMiddleware);
  app.use(express.json());
  app.use(morgan("dev"));

  app.use(healthRouter);
  app.use(meRouter);
  app.use(profileRouter);
  app.use(publicCategoriesRouter);
  app.use("/seller", sellerRouter);
  // Admin routes must come after auth middleware is registered. The
  // adminRouter applies its own requireAuth and requireRole('ADMIN') middlewares.
  app.use("/admin", adminRouter);

  app.use(errorHandler);

  // await startProducer();

  const server = app.listen(env.PORT, () => {
    console.log(`API listening on :${env.PORT}`);
  });

  const shutdown = async () => {
    console.log("Shutting down...");
    server.close();
    // await stopProducer();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
