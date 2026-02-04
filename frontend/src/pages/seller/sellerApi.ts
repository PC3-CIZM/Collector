import type { ItemReview, Item, Shop } from "./sellerTypes";

const API = import.meta.env.VITE_API_URL;

async function json<T>(r: Response): Promise<T> {
  if (!r.ok) throw new Error(await r.text());
  if (r.status === 204) return undefined as T;
  return r.json();
}

function authHeaders(token: string, withJson = false) {
  return {
    Authorization: `Bearer ${token}`,
    ...(withJson ? { "Content-Type": "application/json" } : {}),
  };
}

/* SHOPS */
export async function sellerListShops(token: string): Promise<Shop[]> {
  return json(await fetch(`${API}/seller/shops`, { headers: authHeaders(token) }));
}

export async function sellerCreateShop(
  token: string,
  payload: { name: string; description?: string; logo_url?: string }
): Promise<Shop> {
  return json(
    await fetch(`${API}/seller/shops`, {
      method: "POST",
      headers: authHeaders(token, true),
      body: JSON.stringify(payload),
    })
  );
}

/* ITEMS */
export async function sellerListItems(token: string): Promise<Item[]> {
  return json(await fetch(`${API}/seller/items`, { headers: authHeaders(token) }));
}

export async function sellerGetItemDetail(token: string, id: number) {
  return json<SellerItemDetail>(await fetch(`${API}/seller/items/${id}`, { headers: authHeaders(token) }));
}

export async function sellerCreateItem(
  token: string,
  payload: {
    shop_id: number;
    category_id?: number | null;
    title: string;
    description: string;
    price: number;
    shipping_cost?: number;
    images: string[];
  }
) {
  return json(
    await fetch(`${API}/seller/items`, {
      method: "POST",
      headers: authHeaders(token, true),
      body: JSON.stringify(payload),
    })
  );
}

export async function sellerUpdateItem(
  token: string,
  itemId: number,
  patch: Partial<{
    title: string;
    description: string;
    price: number;
    shipping_cost: number;
    category_id: number | null;
  }>
) {
  return json(
    await fetch(`${API}/seller/items/${itemId}`, {
      method: "PUT",
      headers: authHeaders(token, true),
      body: JSON.stringify(patch),
    })
  );
}

export async function sellerReplaceImages(token: string, itemId: number, images: string[]) {
  return json(
    await fetch(`${API}/seller/items/${itemId}/images`, {
      method: "PUT",
      headers: authHeaders(token, true),
      body: JSON.stringify({ images }),
    })
  );
}

export async function sellerSubmitItem(token: string, itemId: number) {
  return json(
    await fetch(`${API}/seller/items/${itemId}/submit`, {
      method: "POST",
      headers: authHeaders(token),
    })
  );
}

export async function sellerMarkSold(token: string, itemId: number) {
  return json(
    await fetch(`${API}/seller/items/${itemId}/mark-sold`, {
      method: "POST",
      headers: authHeaders(token),
    })
  );
}

export async function sellerDeleteItem(token: string, itemId: number) {
  return json(
    await fetch(`${API}/seller/items/${itemId}`, {
      method: "DELETE",
      headers: authHeaders(token),
    })
  );
}

/* public categories */
export async function fetchCategories() {
  const r = await fetch(`${API}/categories`);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export type SellerItemDetail = {
  item: Item;
  images: { id: number; url: string; position: number; is_primary: boolean }[];
  reviews: (ItemReview & { admin_name?: string | null })[];
};
