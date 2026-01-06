import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { upsertUserFromAuth } from "../services/user.service";

export const meRouter = Router();

meRouter.post("/me/sync", requireAuth, async (req, res, next) => {
  try {
    const auth = (req as any).auth; // contient sub
    const email = req.body?.email ?? null; // vient du front (Auth0 user)
    const user = await upsertUserFromAuth(auth, email);

    res.json({
      id: user.id,
      email: user.email,
      displayName: user.display_name,
    });
  } catch (err) {
    next(err);
  }
});
