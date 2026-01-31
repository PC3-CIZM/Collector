import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import { env } from "./config/env";
import { healthRouter } from "./routes/health";
import { meRouter } from "./routes/me";
import { errorHandler } from "./middleware/error";
import { startProducer, stopProducer } from "./kafka/producer";
import { profileRouter } from "./routes/display.name";
import { adminRouter } from "./routes/admin";

async function main() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: ["http://localhost:3000"], credentials: true }));
  app.use(express.json());
  app.use(morgan("dev"));

  app.use(healthRouter);
  app.use(meRouter);
  app.use(profileRouter);
  // Admin routes must come after auth middleware is registered. The
  // adminRouter applies its own requireAuth and requireRole('ADMIN') middlewares.
  app.use(adminRouter);

  app.use(errorHandler);

  await startProducer();

  const server = app.listen(env.PORT, () => {
    console.log(`API listening on :${env.PORT}`);
  });

  const shutdown = async () => {
    console.log("Shutting down...");
    server.close();
    await stopProducer();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
