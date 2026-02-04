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

  // IMPORTANT: ne pas bloquer le cross-origin fetch
  app.use(
    helmet({
      crossOriginResourcePolicy: false,
    })
  );

  const norm = (u: string) => u.replace(/\/$/, "");
  const allowedOrigins = new Set(
    [
      env.FRONTEND_URL,
      "http://localhost:5173",
      "http://localhost:3000",
    ]
      .filter(Boolean)
      .map((u) => norm(u!))
  );

  // Log + guard
  app.use((req, res, next) => {
    const origin = req.headers.origin as string | undefined;

    if (req.path === "/me/sync") {
      console.log("[REQ]", {
        method: req.method,
        path: req.path,
        origin,
        acrm: req.headers["access-control-request-method"],
        acrh: req.headers["access-control-request-headers"],
        envFrontendUrl: env.FRONTEND_URL,
      });
    }

    if (!origin) return next();
    if (allowedOrigins.has(norm(origin))) return next();

    console.log("[CORS-BLOCK]", { origin, allowed: Array.from(allowedOrigins) });
    return res.status(403).send(`CORS blocked for origin: ${origin}`);
  });

  const corsMiddleware = cors({
    origin: true, // reflète l'Origin
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    maxAge: 86400,
  });

  app.use(corsMiddleware);
  // ❌ app.options("*", corsMiddleware);   // ça crashe en Express 5
  app.options(/.*/, corsMiddleware);       // ✅ si tu veux vraiment

  // Debug endpoint
  app.get("/__debug/headers", (req, res) => {
    res.json({
      ok: true,
      origin: req.headers.origin,
      host: req.headers.host,
      envFrontendUrl: env.FRONTEND_URL,
      allowedOrigins: Array.from(allowedOrigins),
    });
  });

  app.use(express.json());
  app.use(morgan("dev"));

  app.use(healthRouter);
  app.use(meRouter);
  app.use(profileRouter);
  app.use(publicCategoriesRouter);
  app.use("/seller", sellerRouter);
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
