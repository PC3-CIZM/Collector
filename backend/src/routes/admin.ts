import { Router } from "express";
import { db } from "../db/pool";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/roles";
import {
  deleteAuth0User,
  setAuth0UserBlocked,
  changeAuth0UserEmail,
  changeAuth0UserPassword,
  assertAuth0DatabaseUser
} from "../services/auth0.management";
import { requireAdmin } from "../middleware/roles";
import { getDbUserFromAuthSub } from "../services/auth.service";

/**
 * Router providing administrative endpoints for managing users and categories.
 * All routes under this router require the authenticated user to have the
 * 'ADMIN' role. The requireAuth middleware verifies the JWT and extracts
 * the Auth0 subject (sub), and requireRole('ADMIN') ensures the user has
 * the ADMIN role in the local database.
 */
export const adminRouter = Router();

// Apply auth & role middlewares to all admin routes
adminRouter.use(requireAuth);
adminRouter.use(requireRole("ADMIN"));

/**
 * GET /users
 *
 * Returns a list of all users with their id, auth0_id, email,
 * display_name, is_active and roles.
 */
adminRouter.get("/users", async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT u.id, u.auth0_id, u.email, u.display_name, u.is_active,
              json_agg(ur.role) FILTER (WHERE ur.role IS NOT NULL) AS roles
       FROM users u
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       GROUP BY u.id
       ORDER BY u.id`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /users/:id/active
 *
 * Activate or deactivate a user. The request body should contain
 * `{ isActive: boolean }`. When deactivated, the user is also blocked in
 * Auth0 so that they cannot log in. When reactivated, the user is
 * unblocked in Auth0.
 */
adminRouter.put("/users/:id/active", async (req, res, next) => {
  try {
    const userId = Number(req.params.id);
    const isActive = Boolean(req.body?.isActive);
    // Fetch Auth0 ID before updating so we know which account to modify
    const { rows } = await db.query(
      `SELECT auth0_id FROM users WHERE id = $1`,
      [userId]
    );
    if (rows.length === 0) return res.status(404).json({ error: "User not found" });
    const auth0Id = rows[0].auth0_id;
    // Update local database
    await db.query(
      `UPDATE users SET is_active = $1, updated_at = NOW() WHERE id = $2`,
      [isActive, userId]
    );
    // Block/unblock in Auth0 (blocked = !isActive)
    await setAuth0UserBlocked(auth0Id, !isActive);
    res.json({ id: userId, isActive });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /users/:id
 *
 * Completely delete a user. This removes the user and all associated
 * records from the local database (via ON DELETE CASCADE on foreign keys)
 * and deletes the user from Auth0. Use with caution.
 */
adminRouter.delete("/users/:id", async (req, res, next) => {
  try {
    const userId = Number(req.params.id);
    // Find the Auth0 ID before deleting
    const { rows } = await db.query(
      `SELECT auth0_id FROM users WHERE id = $1`,
      [userId]
    );
    if (rows.length === 0) return res.status(404).json({ error: "User not found" });
    const auth0Id = rows[0].auth0_id;
    // Delete from local DB (foreign keys cascade)
    await db.query(`DELETE FROM users WHERE id = $1`, [userId]);
    // Delete from Auth0
    await deleteAuth0User(auth0Id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /users/:id/role
 *
 * Assign a new primary role to a user. The request body should contain
 * `{ role: 'BUYER' | 'SELLER' }`. This replaces any existing BUYER/SELLER
 * role assignment with the new one. The user may still retain the ADMIN
 * role if present.
 */
adminRouter.put("/users/:id/role", async (req, res, next) => {
  try {
    const userId = Number(req.params.id);
    const myAuth0Id = (req as any).auth?.sub;
    const role: string = String(req.body?.role).toUpperCase();
    // Prevent admin from changing their own role
    const { rows: selfRows } = await db.query(
      `SELECT id FROM users WHERE auth0_id = $1`,
      [myAuth0Id]
    );
    if (selfRows.length > 0 && selfRows[0].id === userId) {
      return res.status(400).json({ error: "Cannot change your own role" });
    }
    // Validate role
    if (role !== "BUYER" && role !== "SELLER") {
      return res.status(400).json({ error: "Invalid role" });
    }
    // Ensure user exists
    const { rows: userRows } = await db.query(
      `SELECT id FROM users WHERE id = $1`,
      [userId]
    );
    if (userRows.length === 0) return res.status(404).json({ error: "User not found" });
    // Remove existing buyer/seller role assignments
    await db.query(
      `DELETE FROM user_roles WHERE user_id = $1 AND role IN ('BUYER','SELLER')`,
      [userId]
    );
    // Insert new role if not exists
    await db.query(
      `INSERT INTO user_roles (user_id, role) VALUES ($1, $2) ON CONFLICT (user_id, role) DO NOTHING`,
      [userId, role]
    );
    res.json({ id: userId, role });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /users/:id/display-name
 *
 * Update a user's display name. The body should contain `{ displayName: string }`.
 */
adminRouter.put("/users/:id/display-name", async (req, res, next) => {
  try {
    const userId = Number(req.params.id);
    const displayName = String(req.body?.displayName ?? "").trim();
    if (displayName.length < 3 || displayName.length > 30) {
      return res.status(400).json({ error: "displayName must be 3-30 chars" });
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(displayName)) {
      return res.status(400).json({ error: "displayName: use letters, numbers, _ or - only" });
    }
    const { rows } = await db.query(
      `UPDATE users SET display_name = $1, updated_at = NOW() WHERE id = $2 RETURNING id, email, display_name`,
      [displayName, userId]
    );
    if (rows.length === 0) return res.status(404).json({ error: "User not found" });
    res.json({ id: rows[0].id, email: rows[0].email, displayName: rows[0].display_name });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /users/:id/email
 *
 * Update a user's email address both locally and in Auth0. The request
 * body should contain `{ email: string }`. If the email is invalid the
 * request will be rejected.
 */
adminRouter.put("/users/:id/email", async (req, res, next) => {
  try {
    const userId = Number(req.params.id);
    const email = String(req.body?.email ?? "").trim();
    if (!email.includes("@")) {
      return res.status(400).json({ error: "Invalid email" });
    }
    // Look up auth0 id
    const { rows: userRows } = await db.query(
      `SELECT auth0_id FROM users WHERE id = $1`,
      [userId]
    );
    if (userRows.length === 0) return res.status(404).json({ error: "User not found" });
    const auth0Id = userRows[0].auth0_id;
    await assertAuth0DatabaseUser(auth0Id);
    // Update Auth0 first so that if it fails we don't corrupt local state
    await changeAuth0UserEmail(auth0Id, email);
    // Update local DB
    await db.query(
      `UPDATE users SET email = $1, updated_at = NOW() WHERE id = $2`,
      [email, userId]
    );
    res.json({ id: userId, email });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /users/:id/password
 *
 * Change a user's password in Auth0. The body should contain
 * `{ password: string }`. The password policy is enforced by Auth0.
 */
adminRouter.put("/users/:id/password", async (req, res, next) => {
  try {
    const userId = Number(req.params.id);
    const newPassword = String(req.body?.password ?? "");
    if (newPassword.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters long" });
    }
    const { rows: userRows } = await db.query(
      `SELECT auth0_id FROM users WHERE id = $1`,
      [userId]
    );
    if (userRows.length === 0) return res.status(404).json({ error: "User not found" });
    const auth0Id = userRows[0].auth0_id;
    await assertAuth0DatabaseUser(auth0Id);
    await changeAuth0UserPassword(auth0Id, newPassword);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

/**
 * GET /categories
 *
 * List all categories. Includes id, name, parent_id and is_active.
 */
adminRouter.get("/categories", async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT id, name, parent_id, is_active FROM categories ORDER BY id`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /categories
 *
 * Create a new category. The body should contain `{ name: string, parentId?: number }`.
 */
adminRouter.post("/categories", async (req, res, next) => {
  try {
    const name = String(req.body?.name ?? "").trim();
    const parentId = req.body?.parentId ? Number(req.body.parentId) : null;
    if (name.length === 0) return res.status(400).json({ error: "Name is required" });
    const { rows } = await db.query(
      `INSERT INTO categories (name, parent_id) VALUES ($1, $2) RETURNING id, name, parent_id, is_active`,
      [name, parentId]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    // Handle unique violation gracefully
    if ((err as any).code === "23505") {
      return res.status(400).json({ error: "Category name must be unique" });
    }
    next(err);
  }
});

/**
 * PUT /categories/:id
 *
 * Update a category's name, parent or active status. Body may contain
 * `{ name?: string, parentId?: number | null, isActive?: boolean }`.
 */
adminRouter.put("/categories/:id", async (req, res, next) => {
  try {
    const catId = Number(req.params.id);
    const name = req.body?.name !== undefined ? String(req.body.name).trim() : undefined;
    const parentId = req.body?.parentId !== undefined ? (req.body.parentId === null ? null : Number(req.body.parentId)) : undefined;
    const isActive = req.body?.isActive !== undefined ? Boolean(req.body.isActive) : undefined;
    // Build dynamic SQL
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;
    if (name !== undefined) {
      if (name.length === 0) return res.status(400).json({ error: "Name cannot be empty" });
      fields.push(`name = $${idx++}`);
      values.push(name);
    }
    if (parentId !== undefined) {
      fields.push(`parent_id = $${idx++}`);
      values.push(parentId);
    }
    if (isActive !== undefined) {
      fields.push(`is_active = $${idx++}`);
      values.push(isActive);
    }
    if (fields.length === 0) return res.status(400).json({ error: "Nothing to update" });
    values.push(catId);
    // Perform the update. We build the SET clause dynamically based on which
    // fields were supplied. The id placeholder is always the last value in
    // the `values` array.
    const { rows } = await db.query(
      `UPDATE categories SET ${fields.join(", ")} WHERE id = $${values.length} RETURNING id, name, parent_id, is_active`,
      values
    );
    if (rows.length === 0) return res.status(404).json({ error: "Category not found" });
    res.json(rows[0]);
  } catch (err) {
    if ((err as any).code === "23505") {
      return res.status(400).json({ error: "Category name must be unique" });
    }
    next(err);
  }
});

/**
 * DELETE /categories/:id
 *
 * Soft delete a category by marking it as inactive. This preserves the
 * category record for referential integrity but prevents it from being
 * used. If the category does not exist a 404 is returned.
 */
adminRouter.delete("/categories/:id", async (req, res, next) => {
  try {
    const catId = Number(req.params.id);
    const { rows } = await db.query(
      `UPDATE categories SET is_active = FALSE WHERE id = $1 RETURNING id, name, parent_id, is_active`,
      [catId]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Category not found" });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// LIST PENDING_REVIEW items with moderation + images
adminRouter.get("/collector/items", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { rows } = await db.query(`
      SELECT
        i.*,
        s.name as shop_name,
        u.display_name as seller_name,
        u.email as seller_email,
        COALESCE(m.title_status,'ORANGE') as title_status,
        COALESCE(m.description_status,'ORANGE') as description_status,
        COALESCE(m.images_status,'ORANGE') as images_status,
        COALESCE(m.auto_score,0) as auto_score,
        COALESCE(m.human_status,'PENDING') as human_status,
        (SELECT COALESCE(json_agg(ii ORDER BY ii.position), '[]'::json) FROM item_images ii WHERE ii.item_id = i.id) AS images
      FROM items i
      JOIN shops s ON s.id = i.shop_id
      JOIN users u ON u.id = s.owner_id
      LEFT JOIN item_moderation m ON m.item_id = i.id
      WHERE i.status = 'PENDING_REVIEW'
      ORDER BY i.updated_at DESC
    `);
    res.json(rows);
  } catch (e) {
    next(e);
  }
});

adminRouter.get("/collector/items/:id/reviews", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const itemId = Number(req.params.id);
    const { rows } = await db.query(
      `
      SELECT r.id, r.decision, r.notes, r.traffic_photo, r.traffic_title, r.traffic_description, r.created_at,
             u.display_name as admin_name
      FROM item_reviews r
      LEFT JOIN users u ON u.id = r.admin_id
      WHERE r.item_id = $1
      ORDER BY r.created_at DESC
      `,
      [itemId]
    );
    res.json(rows);
  } catch (e) {
    next(e);
  }
});

adminRouter.post("/collector/items/:id/review", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const authSub = (req as any).auth?.sub as string;
    const admin = await getDbUserFromAuthSub(authSub);
    if (!admin) return res.status(403).json({ error: "Forbidden" });

    const itemId = Number(req.params.id);
    const { decision, notes, traffic_photo, traffic_title, traffic_description } = req.body;

    if (decision !== "PUBLISHED" && decision !== "REJECTED") {
      return res.status(400).json({ error: "Invalid decision" });
    }
    if (typeof notes !== "string" || notes.trim().length < 2) {
      return res.status(400).json({ error: "Notes are required" });
    }

    // log history
    await db.query(
      `
      INSERT INTO item_reviews (item_id, admin_id, decision, notes, traffic_photo, traffic_title, traffic_description)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      `,
      [itemId, admin.id, decision, notes.trim(), traffic_photo ?? "GREEN", traffic_title ?? "GREEN", traffic_description ?? "GREEN"]
    );

    // set item status
    const nextStatus = decision === "PUBLISHED" ? "PUBLISHED" : "REJECTED";
    const { rows } = await db.query(
      `UPDATE items SET status=$1, updated_at=NOW() WHERE id=$2 RETURNING *`,
      [nextStatus, itemId]
    );

    res.json(rows[0]);
  } catch (e) {
    next(e);
  }
});
