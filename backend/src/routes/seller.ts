import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/roles";
import { db } from "../db/pool";
import { getDbUserFromAuthSub } from "../services/auth.service";

export const sellerRouter = Router();

sellerRouter.use(requireAuth);
sellerRouter.use(requireRole("SELLER"));

function getAuth0Sub(req: any) {
  return req?.auth?.sub as string;
}

async function getMeUserId(req: any): Promise<number> {
  const sub = getAuth0Sub(req);
  const { rows } = await db.query(`SELECT id FROM users WHERE auth0_id = $1`, [sub]);
  if (!rows[0]) throw new Error("User not found");
  return rows[0].id;
}

/**
 * SHOPS
 */

sellerRouter.get("/shops", async (req, res, next) => {
  try {
    const meId = await getMeUserId(req);
    const { rows } = await db.query(
      `SELECT * FROM shops WHERE owner_id = $1 AND is_active = TRUE ORDER BY created_at DESC`,
      [meId]
    );
    res.json(rows);
  } catch (e) {
    next(e);
  }
});

sellerRouter.post("/shops", async (req, res, next) => {
  try {
    const meId = await getMeUserId(req);
    const name = String(req.body?.name ?? "").trim();
    const description = req.body?.description ? String(req.body.description) : null;
    const logo_url = req.body?.logo_url ? String(req.body.logo_url) : null;

    if (!name || name.length < 3) return res.status(400).json({ error: "Invalid shop name" });

    const { rows } = await db.query(
      `INSERT INTO shops (owner_id, name, description, logo_url)
       VALUES ($1,$2,$3,$4)
       RETURNING *`,
      [meId, name, description, logo_url]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    next(e);
  }
});

/**
 * ITEMS
 */

// list my items
sellerRouter.get("/items", async (req, res, next) => {
  try {
    const authSub = (req as any).auth?.sub as string;
    const me = await getDbUserFromAuthSub(authSub);
    if (!me) return res.status(403).json({ error: "Forbidden" });

    const { rows } = await db.query(
      `
      SELECT
        i.*,
        c.name AS category_name,
        (SELECT COALESCE(json_agg(ii ORDER BY ii.position), '[]'::json)
         FROM item_images ii WHERE ii.item_id = i.id) AS images,
        (
          SELECT jsonb_build_object(
            'id', r.id,
            'decision', r.decision,
            'notes', r.notes,
            'traffic_photo', r.traffic_photo,
            'traffic_title', r.traffic_title,
            'traffic_description', r.traffic_description,
            'created_at', r.created_at
          )
          FROM item_reviews r
          WHERE r.item_id = i.id
          ORDER BY r.created_at DESC
          LIMIT 1
        ) AS last_review
      FROM items i
      JOIN shops s ON s.id = i.shop_id
      LEFT JOIN categories c ON c.id = i.category_id
      WHERE s.owner_id = $1
      ORDER BY i.updated_at DESC
      `,
      [me.id]
    );

    res.json(rows);
  } catch (e) {
    next(e);
  }
});

// get detail (includes images + last review)
sellerRouter.get("/items/:id", async (req, res, next) => {
  try {
    const authSub = (req as any).auth?.sub as string;
    const me = await getDbUserFromAuthSub(authSub);
    if (!me) return res.status(403).json({ error: "Forbidden" });

    const itemId = Number(req.params.id);

    const { rows: itemRows } = await db.query(
      `
      SELECT i.*
      FROM items i
      JOIN shops s ON s.id = i.shop_id
      WHERE i.id = $1 AND s.owner_id = $2
      `,
      [itemId, me.id]
    );
    const item = itemRows[0];
    if (!item) return res.status(404).json({ error: "Not found" });

    const { rows: images } = await db.query(
      `SELECT id, url, position, is_primary FROM item_images WHERE item_id = $1 ORDER BY position ASC`,
      [itemId]
    );

    // last review only (seller only needs latest note on REJECTED)
    const { rows: reviews } = await db.query(
      `
      SELECT r.id, r.decision, r.notes, r.traffic_photo, r.traffic_title, r.traffic_description, r.created_at,
             u.display_name as admin_name
      FROM item_reviews r
      LEFT JOIN users u ON u.id = r.admin_id
      WHERE r.item_id = $1
      ORDER BY r.created_at DESC
      LIMIT 1
      `,
      [itemId]
    ).catch(async () => {
      const { rows } = await db.query(
        `
        SELECT r.id, r.decision, r.notes, r.traffic_photo, r.traffic_title, r.traffic_description, r.created_at,
               u.display_name as admin_name
        FROM item_reviews r
        LEFT JOIN users u ON u.id = r.admin_id
        WHERE r.item_id = $1
        ORDER BY r.created_at DESC
        LIMIT 1
        `,
        [itemId]
      );
      return { rows };
    });

    res.json({ item, images, reviews });
  } catch (e) {
    next(e);
  }
});

// create item (DRAFT)
sellerRouter.post("/items", async (req, res, next) => {
  try {
    const meId = await getMeUserId(req);

    const shop_id = Number(req.body?.shop_id);
    const category_id = req.body?.category_id ? Number(req.body.category_id) : null;
    const title = String(req.body?.title ?? "").trim();
    const description = String(req.body?.description ?? "").trim();
    const price = Number(req.body?.price ?? 0);
    const shipping_cost = Number(req.body?.shipping_cost ?? 0);
    const imageUrls: string[] = Array.isArray(req.body?.images) ? req.body.images : [];

    if (!shop_id) return res.status(400).json({ error: "shop_id required" });

    const { rows: owned } = await db.query(`SELECT id FROM shops WHERE id=$1 AND owner_id=$2`, [
      shop_id,
      meId,
    ]);
    if (!owned[0]) return res.status(403).json({ error: "Not your shop" });

    if (!title || title.length < 3) return res.status(400).json({ error: "Invalid title" });
    if (!description || description.length < 10) return res.status(400).json({ error: "Invalid description" });
    if (!price || price <= 0) return res.status(400).json({ error: "Invalid price" });

    const { rows: itemRows } = await db.query(
      `
      INSERT INTO items (shop_id, category_id, title, description, price, shipping_cost, status)
      VALUES ($1,$2,$3,$4,$5,$6,'DRAFT')
      RETURNING *
      `,
      [shop_id, category_id, title, description, price, shipping_cost]
    );

    const item = itemRows[0];

    for (let idx = 0; idx < imageUrls.length; idx++) {
      const url = String(imageUrls[idx] ?? "").trim();
      if (!url) continue;
      // eslint-disable-next-line no-await-in-loop
      await db.query(
        `INSERT INTO item_images (item_id, url, position, is_primary) VALUES ($1,$2,$3,$4)`,
        [item.id, url, idx, idx === 0]
      );
    }

    res.status(201).json(item);
  } catch (e) {
    next(e);
  }
});

// update item (ONLY DRAFT)
sellerRouter.put("/items/:id", async (req, res, next) => {
  try {
    const authSub = (req as any).auth?.sub as string;
    const me = await getDbUserFromAuthSub(authSub);
    if (!me) return res.status(403).json({ error: "Forbidden" });

    const itemId = Number(req.params.id);

    const { rows } = await db.query(
      `
      SELECT i.id, i.status
      FROM items i
      JOIN shops s ON s.id = i.shop_id
      WHERE i.id = $1 AND s.owner_id = $2
      `,
      [itemId, me.id]
    );
    const existing = rows[0];
    if (!existing) return res.status(404).json({ error: "Not found" });

    if (existing.status !== "DRAFT") {
      return res.status(409).json({ error: "Only DRAFT items can be edited" });
    }

    const { title, description, price, shipping_cost, category_id } = req.body;

    const { rows: updatedRows } = await db.query(
      `
      UPDATE items
      SET title = COALESCE($1, title),
          description = COALESCE($2, description),
          price = COALESCE($3, price),
          shipping_cost = COALESCE($4, shipping_cost),
          category_id = COALESCE($5, category_id),
          updated_at = NOW()
      WHERE id = $6
      RETURNING *
      `,
      [title, description, price, shipping_cost, category_id, itemId]
    );

    res.json(updatedRows[0]);
  } catch (e) {
    next(e);
  }
});

// replace images (ONLY DRAFT)
sellerRouter.put("/items/:id/images", async (req, res, next) => {
  try {
    const meId = await getMeUserId(req);
    const itemId = Number(req.params.id);
    const imageUrls: string[] = Array.isArray(req.body?.images) ? req.body.images : [];

    const { rows: found } = await db.query(
      `
      SELECT i.status, s.owner_id
      FROM items i
      JOIN shops s ON s.id = i.shop_id
      WHERE i.id=$1
      `,
      [itemId]
    );
    if (!found[0]) return res.status(404).json({ error: "Item not found" });
    if (found[0].owner_id !== meId) return res.status(403).json({ error: "Not your item" });

    if (String(found[0].status) !== "DRAFT") {
      return res.status(409).json({ error: "Only DRAFT items can edit images" });
    }

    await db.query(`DELETE FROM item_images WHERE item_id=$1`, [itemId]);
    for (let idx = 0; idx < imageUrls.length; idx++) {
      const url = String(imageUrls[idx] ?? "").trim();
      if (!url) continue;
      // eslint-disable-next-line no-await-in-loop
      await db.query(
        `INSERT INTO item_images (item_id, url, position, is_primary) VALUES ($1,$2,$3,$4)`,
        [itemId, url, idx, idx === 0]
      );
    }

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// submit item to review (requires >=2 images)
sellerRouter.post("/items/:id/submit", async (req, res, next) => {
  try {
    const authSub = (req as any).auth?.sub as string;
    const me = await getDbUserFromAuthSub(authSub);
    if (!me) return res.status(403).json({ error: "Forbidden" });

    const itemId = Number(req.params.id);

    const { rows } = await db.query(
      `
      SELECT i.id, i.status
      FROM items i
      JOIN shops s ON s.id = i.shop_id
      WHERE i.id = $1 AND s.owner_id = $2
      `,
      [itemId, me.id]
    );
    const it = rows[0];
    if (!it) return res.status(404).json({ error: "Not found" });

    if (it.status !== "DRAFT") {
      return res.status(409).json({ error: "Only DRAFT items can be submitted" });
    }

    const { rows: imgRows } = await db.query(
      `SELECT COUNT(*)::int AS cnt FROM item_images WHERE item_id = $1`,
      [itemId]
    );
    if ((imgRows[0]?.cnt ?? 0) < 2) {
      return res.status(400).json({ error: "At least 2 images are required" });
    }

    const { rows: upd } = await db.query(
      `UPDATE items SET status='PENDING_REVIEW', updated_at=NOW() WHERE id=$1 RETURNING *`,
      [itemId]
    );

    res.json(upd[0]);
  } catch (e) {
    next(e);
  }
});

// mark sold (PUBLISHED -> SOLD)
sellerRouter.post("/items/:id/mark-sold", async (req, res, next) => {
  try {
    const meId = await getMeUserId(req);
    const itemId = Number(req.params.id);

    const { rows } = await db.query(
      `
      SELECT i.id, i.status
      FROM items i
      JOIN shops s ON s.id = i.shop_id
      WHERE i.id = $1 AND s.owner_id = $2
      `,
      [itemId, meId]
    );
    const it = rows[0];
    if (!it) return res.status(404).json({ error: "Not found" });
    if (it.status !== "PUBLISHED") return res.status(409).json({ error: "Only PUBLISHED can be marked SOLD" });

    const { rows: upd } = await db.query(
      `UPDATE items SET status='SOLD', updated_at=NOW() WHERE id=$1 RETURNING *`,
      [itemId]
    );
    res.json(upd[0]);
  } catch (e) {
    next(e);
  }
});

// delete item (not allowed if PENDING_REVIEW)
sellerRouter.delete("/items/:id", async (req, res, next) => {
  try {
    const meId = await getMeUserId(req);
    const itemId = Number(req.params.id);

    const { rows } = await db.query(
      `
      SELECT i.id, i.status, s.owner_id
      FROM items i
      JOIN shops s ON s.id = i.shop_id
      WHERE i.id = $1
      `,
      [itemId]
    );
    const it = rows[0];
    if (!it) return res.status(404).json({ error: "Not found" });
    if (it.owner_id !== meId) return res.status(403).json({ error: "Not your item" });
    if (String(it.status) === "PENDING_REVIEW") return res.status(409).json({ error: "Cannot delete under review" });

    await db.query(`DELETE FROM items WHERE id=$1`, [itemId]);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});
