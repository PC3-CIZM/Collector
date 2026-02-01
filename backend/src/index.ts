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

function dumpReq(req: express.Request) {
  return {
    method: req.method,
    url: req.originalUrl,
    path: req.path,
    host: req.headers.host,
    origin: req.headers.origin,
    referer: req.headers.referer,
    acrm: req.headers["access-control-request-method"],
    acrh: req.headers["access-control-request-headers"],
    ua: req.headers["user-agent"],
    xfProto: req.headers["x-forwarded-proto"],
    xfHost: req.headers["x-forwarded-host"],
    xfFor: req.headers["x-forwarded-for"],
  };
}

function dumpResHeaders(res: express.Response, keys?: string[]) {
  const h = res.getHeaders();
  if (!keys) return h;
  const out: Record<string, unknown> = {};
  for (const k of keys) out[k] = h[k.toLowerCase()];
  return out;
}

async function main() {
  const app = express();

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

  console.log("[BOOT] env.FRONTEND_URL =", env.FRONTEND_URL);
  console.log("[BOOT] allowedOrigins =", Array.from(allowedOrigins.values()));

  // =========================================================
  // 0) LOGGING EARLY: voir ce qui arrive AVANT TOUT
  // =========================================================
  app.use((req, res, next) => {
    console.log("\n[INCOMING] =====");
    console.log("[INCOMING]", dumpReq(req));

    // trace quand la réponse se termine + headers finaux
    res.on("finish", () => {
      console.log("[FINISH]", {
        status: res.statusCode,
        cors: {
          "access-control-allow-origin": res.getHeader("access-control-allow-origin"),
          "access-control-allow-credentials": res.getHeader("access-control-allow-credentials"),
          "access-control-allow-methods": res.getHeader("access-control-allow-methods"),
          "access-control-allow-headers": res.getHeader("access-control-allow-headers"),
          vary: res.getHeader("vary"),
        },
      });
    });

    next();
  });

  // =========================================================
  // 1) HELMET (mais on log après)
  // =========================================================
  app.use(helmet());

  app.use((req, res, next) => {
    console.log("[AFTER helmet] headers snapshot:", dumpResHeaders(res, [
      "content-security-policy",
      "cross-origin-resource-policy",
      "x-frame-options",
    ]));
    next();
  });

  // =========================================================
  // 2) GUARD ORIGIN (log décision)
  // =========================================================
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (!origin) {
      console.log("[GUARD] no origin header -> PASS");
      return next();
    }

    const ok = allowedOrigins.has(norm(origin));
    console.log("[GUARD] origin =", origin, " normalized =", norm(origin), " ok =", ok);

    if (ok) return next();

    console.log("[GUARD] BLOCK -> 403");
    return res.status(403).send(`CORS blocked for origin: ${origin}`);
  });

  // =========================================================
  // 3) CORS MIDDLEWARE (log BEFORE/AFTER)
  // =========================================================
  const corsMiddleware = cors({
    origin: true, // reflect origin automatically
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    maxAge: 86400,
  });

  app.use((req, res, next) => {
    console.log("[BEFORE cors] cors headers:", dumpResHeaders(res, [
      "access-control-allow-origin",
      "access-control-allow-credentials",
      "access-control-allow-methods",
      "access-control-allow-headers",
      "vary",
    ]));
    next();
  });

  app.use(corsMiddleware);

  app.use((req, res, next) => {
    console.log("[AFTER cors] cors headers:", dumpResHeaders(res, [
      "access-control-allow-origin",
      "access-control-allow-credentials",
      "access-control-allow-methods",
      "access-control-allow-headers",
      "vary",
    ]));
    next();
  });

  // IMPORTANT: options global
  app.options("*", corsMiddleware);

  // =========================================================
  // 4) DEBUG ENDPOINT: renvoie headers + ce que le serveur voit
  // =========================================================
  app.get("/__debug/headers", (req, res) => {
    res.json({
      seen: dumpReq(req),
      envFrontendUrl: env.FRONTEND_URL,
      allowedOrigins: Array.from(allowedOrigins.values()),
      responseHeaders: res.getHeaders(),
    });
  });

  // =========================================================
  // 5) HANDLER OPTIONS EXPLICITE SUR /me/sync (pour trancher)
  //    Si tu hits bien ce code, on est sûr à 100% que tu es
  //    dans le bon container et qu'Express traite la route.
  // =========================================================
  app.options("/me/sync", (req, res) => {
    console.log("[OPTIONS /me/sync] HIT EXPLICIT HANDLER");
    // on renvoie 204 volontairement
    return res.status(204).send();
  });

  // =========================================================
  // 6) Body + morgan (après cors, sinon preflight bruyant)
  // =========================================================
  app.use(express.json());
  app.use(morgan("dev"));

  // =========================================================
  // 7) Routes
  // =========================================================
  app.use(healthRouter);
  app.use(meRouter);
  app.use(profileRouter);
  app.use(publicCategoriesRouter);
  app.use("/seller", sellerRouter);
  app.use("/admin", adminRouter);

  // =========================================================
  // 8) ERROR HANDLER (log)
  // =========================================================
  app.use((err: any, req: any, res: any, next: any) => {
    console.error("[ERROR middleware] err =", err?.message || err, "req =", dumpReq(req));
    next(err);
  });

  app.use(errorHandler);

  const server = app.listen(env.PORT, () => {
    console.log(`[BOOT] API listening on :${env.PORT}`);
  });

  const shutdown = async () => {
    console.log("[BOOT] Shutting down...");
    server.close();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((e) => {
  console.error("[BOOT] FATAL", e);
  process.exit(1);
});
