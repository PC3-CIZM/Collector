import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { db } from "../db/pool";

export const profileRouter = Router();

profileRouter.put("/me/display-name", requireAuth, async (req, res, next) => {
  try {
    const auth0Id = (req as any).auth?.sub;
    const displayName = String(req.body?.displayName ?? "").trim();

    if (!auth0Id) return res.status(400).json({ error: "Missing sub" });
    if (displayName.length < 3 || displayName.length > 30) {
      return res
        .status(400)
        .json({ error: "displayName must be 3-30 chars" });
    }

    // (Option) validation characters: lettres/chiffres/_/-
    if (!/^[a-zA-Z0-9_-]+$/.test(displayName)) {
      return res.status(400).json({
        error: "displayName: use letters, numbers, _ or - only",
      });
    }

    // Unicité (optionnel mais conseillé)
    const { rows } = await db.query(
      `
      UPDATE users
      SET display_name = $1, updated_at = NOW()
      WHERE auth0_id = $2
      RETURNING id, email, display_name;
      `,
      [displayName, auth0Id]
    );

    if (rows.length === 0) {
      // si /me n'a pas encore été appelé
      return res.status(404).json({ error: "User not found in DB (call /me)" });
    }

    res.json({ id: rows[0].id, email: rows[0].email, displayName: rows[0].display_name });
  } catch (err) {
    next(err);
  }
});
