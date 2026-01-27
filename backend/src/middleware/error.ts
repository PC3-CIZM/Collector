import type { ErrorRequestHandler } from "express";

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const status = err.status || 500;
  res.status(status).json({
    error: err.name || "Error",
    message: err.message || "Unexpected error",
  });
};
