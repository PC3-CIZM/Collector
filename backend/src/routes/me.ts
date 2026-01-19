import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import {
  upsertUserFromAuth,
  assignInitialRoleIfMissing,
} from "../services/user.service";

export const meRouter = Router();

meRouter.post("/me/sync", requireAuth, async (req, res, next) => {
  try {
    const auth = (req as any).auth; // injecté par requireAuth
    const email: string | null = req.body?.email ?? null;
    const roleFromClient: string | null = req.body?.role ?? null;

    // 🔒 sécurité : rôle autorisé UNIQUEMENT au signup
    let initialRole: "BUYER" | "SELLER" | null = null;
    if (roleFromClient) {
      if (roleFromClient !== "BUYER" && roleFromClient !== "SELLER") {
        return res.status(400).json({ error: "Invalid role" });
      }
      initialRole = roleFromClient;
    }

    // 1️⃣ upsert user
    const user = await upsertUserFromAuth(auth, email);

    // 2️⃣ assign role UNIQUEMENT si aucun rôle encore présent
    if (initialRole) {
      await assignInitialRoleIfMissing(user.id, initialRole);
    }

    // 3️⃣ réponse clean (jamais exposer auth0_id)
    res.json({
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      roles: user.roles || [],
    });
  } catch (err) {
    next(err);
  }
});
