import request from "supertest";
import express from "express";
import { healthRouter } from "../routes/health";

describe("GET /health", () => {
  it("doit répondre { ok: true }", async () => {
    const app = express();
    app.use(healthRouter);

    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});
