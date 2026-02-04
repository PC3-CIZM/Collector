import { Router } from "express";
import { db } from "../db/pool";

export const publicRouter = Router();

/**
 * Cursor format: "<updated_at_iso>|<id>"
 */
function encodeCursor(updated_at: string, id: number) {
  return `${new Date(updated_at).toISOString()}|${id}`;
}

function parseCursor(cursor?: string) {
  if (!cursor) return null;
  const [ts, idStr] = cursor.split("|");
  const id = Number(idStr);
  if (!ts || !id) return null;
  return { ts, id };
}

/**
 * GET /public/items?limit=12&cursor=<ts|id>
 * Only PUBLISHED items
 * Returns { items, nextCursor }
 */
publicRouter.get("/items", async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit ?? 12), 50);
    const cursor = parseCursor(String(req.query.cursor ?? "") || undefined);

    const values: any[] = [limit];
    let whereCursor = "";
    if (cursor) {
      values.push(cursor.ts, cursor.id);
      // strictly older than cursor (stable sort)
      whereCursor = `
        AND (
          i.updated_at < $2::timestamptz
          OR (i.updated_at = $2::timestamptz AND i.id < $3)
        )
      `;
    }

    const { rows } = await db.query(
      `
      SELECT
        i.id, i.title, i.description, i.price, i.shipping_cost, i.currency, i.updated_at,
        s.id as shop_id, s.name as shop_name, s.logo_url as shop_logo_url,
        u.id as seller_id, u.display_name as seller_name,
        (SELECT url FROM item_images im WHERE im.item_id = i.id ORDER BY im.position ASC LIMIT 1) AS cover_url
      FROM items i
      JOIN shops s ON s.id = i.shop_id
      JOIN users u ON u.id = s.owner_id
      WHERE i.status = 'PUBLISHED'
        AND s.is_active = TRUE
      ${whereCursor}
      ORDER BY i.updated_at DESC, i.id DESC
      LIMIT $1
      `,
      values
    );

    const next = rows.length === limit ? encodeCursor(rows[rows.length - 1].updated_at, rows[rows.length - 1].id) : null;
    res.json({ items: rows, nextCursor: next });
  } catch (e) {
    next(e);
  }
});


/**
 * GET /public/items/:id
 * Retourne le détail d'une annonce publiée (PUBLISHED) :
 * - item
 * - shop (avec seller_name)
 * - images (triées)
 */
publicRouter.get("/items/:id", async (req, res, next) => {
  try {
    const itemId = Number(req.params.id);
    if (!itemId || Number.isNaN(itemId)) {
      return res.status(400).json({ error: "Invalid item id" });
    }

    // 1) item + shop + vendeur
    const { rows } = await db.query(
      `
      SELECT
        i.id, i.shop_id, i.category_id, i.title, i.description,
        i.price, i.currency, i.shipping_cost, i.status, i.created_at, i.updated_at,

        s.id AS shop_id2,
        s.owner_id AS shop_owner_id,
        s.name AS shop_name,
        s.description AS shop_description,
        s.logo_url AS shop_logo_url,
        s.is_active AS shop_is_active,

        u.display_name AS seller_name
      FROM items i
      JOIN shops s ON s.id = i.shop_id
      JOIN users u ON u.id = s.owner_id
      WHERE i.id = $1
        AND i.status = 'PUBLISHED'
        AND s.is_active = TRUE
      LIMIT 1
      `,
      [itemId]
    );

    const r = rows[0];
    if (!r) return res.status(404).json({ error: "Not found" });

    // 2) images
    const { rows: images } = await db.query(
      `
      SELECT id, item_id, url, position, is_primary
      FROM item_images
      WHERE item_id = $1
      ORDER BY position ASC, id ASC
      `,
      [itemId]
    );

    // 3) format de réponse attendu par ton front
    return res.json({
      item: {
        id: r.id,
        shop_id: r.shop_id,
        category_id: r.category_id,
        title: r.title,
        description: r.description,
        price: r.price,
        currency: r.currency,
        shipping_cost: r.shipping_cost,
        status: r.status, // "PUBLISHED"
        created_at: r.created_at,
        updated_at: r.updated_at,
      },
      shop: {
        id: r.shop_id2,
        owner_id: r.shop_owner_id,
        name: r.shop_name,
        description: r.shop_description,
        logo_url: r.shop_logo_url,
        seller_name: r.seller_name,
      },
      images,
    });
  } catch (e) {
    next(e);
  }
});

/**
 * GET /public/search?q=...
 * Simple search on shop name OR seller display_name
 */
publicRouter.get("/search", async (req, res, next) => {
  try {
    const q = String(req.query.q ?? "").trim();
    if (!q || q.length < 2) return res.json([]);

    const { rows } = await db.query(
      `
      SELECT
        s.id as shop_id,
        s.name as shop_name,
        s.logo_url as shop_logo_url,
        u.id as seller_id,
        u.display_name as seller_name
      FROM shops s
      JOIN users u ON u.id = s.owner_id
      WHERE s.is_active = TRUE
        AND (
          LOWER(s.name) LIKE LOWER($1)
          OR LOWER(COALESCE(u.display_name,'')) LIKE LOWER($1)
        )
      ORDER BY s.created_at DESC
      LIMIT 30
      `,
      [`%${q}%`]
    );

    res.json(rows);
  } catch (e) {
    next(e);
  }
});

/**
 * GET /public/shops/:id
 * Returns shop + items PUBLISHED for this shop
 */
publicRouter.get("/shops/:id", async (req, res, next) => {
  try {
    const shopId = Number(req.params.id);

    const { rows: shopRows } = await db.query(
      `
      SELECT
        s.id, s.name, s.description, s.logo_url, s.owner_id,
        u.display_name as seller_name
      FROM shops s
      JOIN users u ON u.id = s.owner_id
      WHERE s.id = $1 AND s.is_active = TRUE
      `,
      [shopId]
    );

    if (!shopRows[0]) return res.status(404).json({ error: "Shop not found" });

    const { rows: items } = await db.query(
      `
      SELECT
        i.id, i.title, i.description, i.price, i.shipping_cost, i.currency, i.updated_at,
        s.id as shop_id, s.name as shop_name, s.logo_url as shop_logo_url,
        u.id as seller_id, u.display_name as seller_name,
        (SELECT url FROM item_images im WHERE im.item_id = i.id ORDER BY im.position ASC LIMIT 1) AS cover_url
      FROM items i
      JOIN shops s ON s.id = i.shop_id
      JOIN users u ON u.id = s.owner_id
      WHERE i.status = 'PUBLISHED'
        AND i.shop_id = $1
      ORDER BY i.updated_at DESC, i.id DESC
      `,
      [shopId]
    );

    res.json({ shop: shopRows[0], items });
  } catch (e) {
    next(e);
  }
});

/**
 * GET /public/sellers/:id
 * Returns seller + his shops
 */
publicRouter.get("/sellers/:id", async (req, res, next) => {
  try {
    const sellerId = Number(req.params.id);

    const { rows: sellerRows } = await db.query(
      `SELECT id, display_name FROM users WHERE id = $1`,
      [sellerId]
    );
    if (!sellerRows[0]) return res.status(404).json({ error: "Seller not found" });

    const { rows: shops } = await db.query(
      `
      SELECT id, name, logo_url, description
      FROM shops
      WHERE owner_id = $1 AND is_active = TRUE
      ORDER BY created_at DESC
      `,
      [sellerId]
    );

    res.json({ seller: sellerRows[0], shops });
  } catch (e) {
    next(e);
  }
});
