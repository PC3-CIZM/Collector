import { Router } from "express";
import { db } from "../db/pool";

export const publicCategoriesRouter = Router();

publicCategoriesRouter.get("/categories", async (_req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT id, name, parent_id, is_active
       FROM categories
       WHERE is_active = TRUE
       ORDER BY name ASC`
    );
    res.json(rows);
  } catch (e) {
    next(e);
  }
});
