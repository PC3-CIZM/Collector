import { NextFunction, Request, Response } from "express";
import { db } from "../db/pool";

/**
 * Require that the authenticated user has a given role before proceeding.
 *
 * This middleware assumes that the requireAuth middleware has already
 * populated `req.auth` with the Auth0 JWT claims. It looks up the user
 * in the local database by their Auth0 ID and verifies that at least one
 * of their roles matches the required role. If the user does not have
 * the role, a 403 Forbidden response is returned.
 *
 * @param role the role that is required (e.g. 'ADMIN')
 */
export function requireRole(role: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const auth0Id = (req as any).auth?.sub;
      console.log("Checking role", role, "for user", auth0Id);
      if (!auth0Id) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const { rows } = await db.query(
        `SELECT ur.role
         FROM users u
         JOIN user_roles ur ON ur.user_id = u.id
         WHERE u.auth0_id = $1`,
        [auth0Id]
      );

      console.log("User roles:", rows);

      const roles = rows.map((r: any) => r.role);

      console.log("Required role:", role, "User roles:", roles);
      if (!roles.includes(role)) {
        console.log("User does not have required role:", role);
        return res.status(403).json({ error: "Forbidden" });
      }
      next();
    } catch (err) {
      console.error("Error in requireRole middleware:", err);
      next(err);
    }
  };
}

/**
 * Shortcut for requiring the 'ADMIN' role. This helper exists to
 * make route declarations more expressive.
 */
/**
 * Middleware to require the 'ADMIN' role. Equivalent to
 * `requireRole('ADMIN')` but easier to import.
 */
export const requireAdmin = requireRole("ADMIN");