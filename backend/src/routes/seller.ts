import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/roles";
import { db } from "../db/pool";
import { runModerationCheck } from "../services/moderation.service";
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

// list my shops
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

// create shop
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

// update shop
sellerRouter.put("/shops/:id", async (req, res, next) => {
  try {
    const meId = await getMeUserId(req);
    const shopId = Number(req.params.id);
    const name = req.body?.name ? String(req.body.name).trim() : null;
    const description = req.body?.description !== undefined ? String(req.body.description) : null;
    const logo_url = req.body?.logo_url !== undefined ? String(req.body.logo_url) : null;

    const { rows: owned } = await db.query(`SELECT id FROM shops WHERE id=$1 AND owner_id=$2`, [
      shopId,
      meId,
    ]);
    if (!owned[0]) return res.status(403).json({ error: "Not your shop" });

    const { rows } = await db.query(
      `UPDATE shops
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           logo_url = COALESCE($3, logo_url),
           updated_at = NOW()
       WHERE id=$4
       RETURNING *`,
      [name, description, logo_url, shopId]
    );

    res.json(rows[0]);
  } catch (e) {
    next(e);
  }
});

// deactivate shop
sellerRouter.delete("/shops/:id", async (req, res, next) => {
  try {
    const meId = await getMeUserId(req);
    const shopId = Number(req.params.id);

    const { rows: owned } = await db.query(`SELECT id FROM shops WHERE id=$1 AND owner_id=$2`, [
      shopId,
      meId,
    ]);
    if (!owned[0]) return res.status(403).json({ error: "Not your shop" });

    const { rows } = await db.query(
      `UPDATE shops SET is_active=FALSE WHERE id=$1 RETURNING *`,
      [shopId]
    );
    res.json(rows[0]);
  } catch (e) {
    next(e);
  }
});

/**
 * ITEMS / LISTINGS
 */

// list my items (all statuses)
sellerRouter.get("/items", requireAuth, requireRole("SELLER"), async (req, res, next) => {
  try {
    const authSub = (req as any).auth?.sub as string;
    const me = await getDbUserFromAuthSub(authSub);
    if (!me) return res.status(403).json({ error: "Forbidden" });

    const { rows } = await db.query(
      `
      SELECT
        i.*,
        c.name AS category_name,
        (SELECT url FROM item_images im WHERE im.item_id = i.id ORDER BY im.position ASC LIMIT 1) AS cover_url,
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

sellerRouter.get("/items/:id", requireAuth, requireRole("SELLER"), async (req, res, next) => {
  try {
    const authSub = (req as any).auth?.sub as string;
    const me = await getDbUserFromAuthSub(authSub);
    if (!me) return res.status(403).json({ error: "Forbidden" });

    const itemId = Number(req.params.id);

    // ownership check
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

    const { rows: reviews } = await db.query(
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

    // images (optional at create, but required at submit)
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

// update item (allowed if DRAFT or PUBLISHED -> becomes PENDING_REVIEW)
sellerRouter.put("/items/:id", requireAuth, requireRole("SELLER"), async (req, res, next) => {
  try {
    const authSub = (req as any).auth?.sub as string;
    const me = await getDbUserFromAuthSub(authSub);
    if (!me) return res.status(403).json({ error: "Forbidden" });

    const itemId = Number(req.params.id);

    // verify ownership + current status
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

    if (existing.status === "PENDING_REVIEW" || existing.status === "PUBLISHED" || existing.status === "SOLD") {
      return res.status(409).json({ error: "Item cannot be edited in current status" });
    }

    const { title, description, price, shipping_cost, category_id } = req.body;

    // si REJECTED -> on repasse DRAFT à la première modif
    const nextStatus = existing.status === "REJECTED" ? "DRAFT" : existing.status;

    const { rows: updatedRows } = await db.query(
      `
      UPDATE items
      SET title = COALESCE($1, title),
          description = COALESCE($2, description),
          price = COALESCE($3, price),
          shipping_cost = COALESCE($4, shipping_cost),
          category_id = COALESCE($5, category_id),
          status = $6,
          updated_at = NOW()
      WHERE id = $7
      RETURNING *
      `,
      [title, description, price, shipping_cost, category_id, nextStatus, itemId]
    );

    res.json(updatedRows[0]);
  } catch (e) {
    next(e);
  }
});

// replace images (only if DRAFT or PUBLISHED -> resubmit)
sellerRouter.put("/items/:id/images", async (req, res, next) => {
  try {
    const meId = await getMeUserId(req);
    const itemId = Number(req.params.id);
    const imageUrls: string[] = Array.isArray(req.body?.images) ? req.body.images : [];

    const { rows: found } = await db.query(
      `
      SELECT i.*, s.owner_id
      FROM items i
      JOIN shops s ON s.id = i.shop_id
      WHERE i.id=$1
      `,
      [itemId]
    );
    if (!found[0]) return res.status(404).json({ error: "Item not found" });
    if (found[0].owner_id !== meId) return res.status(403).json({ error: "Not your item" });

    const status = String(found[0].status);
    if (status === "PENDING_REVIEW") {
      return res.status(409).json({ error: "Item is under review, cannot edit images" });
    }

    // replace
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

    // if published -> resubmit
    const shouldResubmit = status === "PUBLISHED";
    if (shouldResubmit) {
      await db.query(`UPDATE items SET status='PENDING_REVIEW', updated_at=NOW() WHERE id=$1`, [itemId]);

      const { rows: imgs } = await db.query(
        `SELECT url FROM item_images WHERE item_id=$1 ORDER BY position ASC`,
        [itemId]
      );
      const urls = imgs.map((x) => x.url);
      const title = found[0].title;
      const description = found[0].description ?? "";

      const result = await runModerationCheck({ title, description, imageUrls: urls });

      await db.query(
        `
        INSERT INTO item_moderation (item_id, title_status, description_status, images_status, auto_score, auto_details, human_status, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,'PENDING',NOW())
        ON CONFLICT (item_id)
        DO UPDATE SET
          title_status=EXCLUDED.title_status,
          description_status=EXCLUDED.description_status,
          images_status=EXCLUDED.images_status,
          auto_score=EXCLUDED.auto_score,
          auto_details=EXCLUDED.auto_details,
          human_status='PENDING',
          reviewed_by=NULL,
          reviewed_at=NULL,
          reviewer_note=NULL,
          updated_at=NOW()
        `,
        [
          itemId,
          result.title_status,
          result.description_status,
          result.images_status,
          result.auto_score,
          JSON.stringify(result.auto_details ?? {}),
        ]
      );
    }

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// submit item to review (requires >=2 images)
sellerRouter.post("/items/:id/submit", requireAuth, requireRole("SELLER"), async (req, res, next) => {
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

    // vérif minimum 2 photos
    const { rows: imgRows } = await db.query(
      `SELECT COUNT(*)::int AS cnt FROM item_images WHERE item_id = $1`,
      [itemId]
    );
    if ((imgRows[0]?.cnt ?? 0) < 2) {
      return res.status(400).json({ error: "At least 2 images are required" });
    }

    // TODO: auto-check content externe ici (title/description + photos)
    // -> tu stockes les traffic lights dans une table/colonne ou tu les recalcules côté admin.
    // Pour l’instant : on repasse PENDING_REVIEW.
    const { rows: upd } = await db.query(
      `UPDATE items SET status='PENDING_REVIEW', updated_at=NOW() WHERE id=$1 RETURNING *`,
      [itemId]
    );

    res.json(upd[0]);
  } catch (e) {
    next(e);
  }
});
