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
  const norm = (u: string) => u.replace(/\/$/, "");
  const allowedOrigins = new Set(
    [
      env.FRONTEND_URL,
      "http://localhost:5173",
      "http://localhost:3000",
    ]
      .filter(Boolean)
      .map(norm)
  );

  // 1) Guard: bloque si origin pas autorisée
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (!origin) return next(); // curl/postman
    if (allowedOrigins.has(norm(origin))) return next();
    return res.status(403).send(`CORS blocked for origin: ${origin}`);
  });

  // 2) CORS: reflète l'Origin (et donc écrit toujours Allow-Origin)
  const corsMiddleware = cors({
    origin: true,
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
