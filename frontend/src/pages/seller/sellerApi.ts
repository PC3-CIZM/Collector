import type { Item, Shop } from "./sellerTypes";

const API = "http://localhost:4000";

async function json<T>(r: Response): Promise<T> {
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

/* SHOPS */
export async function sellerListShops(token: string): Promise<Shop[]> {
  return json(
    await fetch(`${API}/seller/shops`, { headers: { Authorization: `Bearer ${token}` } })
  );
}

export async function sellerCreateShop(
  token: string,
  payload: { name: string; description?: string; logo_url?: string }
): Promise<Shop> {
  return json(
    await fetch(`${API}/seller/shops`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
  );
}

/* ITEMS */
export async function sellerListItems(token: string): Promise<Item[]> {
  return json(
    await fetch(`${API}/seller/items`, { headers: { Authorization: `Bearer ${token}` } })
  );
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
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
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
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    })
  );
}

export async function sellerReplaceImages(token: string, itemId: number, images: string[]) {
  return json(
    await fetch(`${API}/seller/items/${itemId}/images`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ images }),
    })
  );
}

export async function sellerSubmitItem(token: string, itemId: number) {
  return json(
    await fetch(`${API}/seller/items/${itemId}/submit`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    })
  );
}

export async function fetchSellerItems(token: string) {
  const r = await fetch(`${API}/seller/items`, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function fetchSellerItemDetail(token: string, id: number) {
  const r = await fetch(`${API}/seller/items/${id}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function updateSellerItem(token: string, id: number, patch: any) {
  const r = await fetch(`${API}/seller/items/${id}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function submitSellerItem(token: string, id: number) {
  const r = await fetch(`${API}/seller/items/${id}/submit`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function fetchCategories(token?: string) {
  const r = await fetch(`${API}/categories`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
