const API = import.meta.env.VITE_API_URL;

async function json<T>(r: Response): Promise<T> {
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export type PublicItem = {
  id: number;
  title: string;
  description: string | null;
  price: string | number;
  shipping_cost: string | number;
  currency: string;
  updated_at: string;

  shop_id: number;
  shop_name: string;
  shop_logo_url: string | null;

  seller_id: number;
  seller_name: string | null;

  cover_url: string | null;
};

export type PublicItemsPage = {
  items: PublicItem[];
  nextCursor: string | null;
};

export type ShopSearchResult = {
  shop_id: number;
  shop_name: string;
  shop_logo_url: string | null;
  seller_id: number;
  seller_name: string | null;
};

export type PublicShopDetail = {
  shop: {
    id: number;
    name: string;
    description: string | null;
    logo_url: string | null;
    owner_id: number;
    seller_name: string | null;
  };
  items: PublicItem[];
};

export type PublicSellerDetail = {
  seller: {
    id: number;
    display_name: string | null;
  };
  shops: { id: number; name: string; logo_url: string | null; description: string | null }[];
};

export async function fetchPublicItems(params: { limit?: number; cursor?: string | null }) {
  const url = new URL(`${API}/public/items`);
  if (params.limit) url.searchParams.set("limit", String(params.limit));
  if (params.cursor) url.searchParams.set("cursor", params.cursor);
  return json<PublicItemsPage>(await fetch(url.toString()));
}

export async function searchShops(q: string) {
  const url = new URL(`${API}/public/search`);
  url.searchParams.set("q", q);
  return json<ShopSearchResult[]>(await fetch(url.toString()));
}

export async function fetchShopDetail(shopId: number) {
  return json<PublicShopDetail>(await fetch(`${API}/public/shops/${shopId}`));
}

export async function fetchSellerDetail(sellerId: number) {
  return json<PublicSellerDetail>(await fetch(`${API}/public/sellers/${sellerId}`));
}

export async function fetchPublicItemDetail(itemId: number) {
  const r = await fetch(`${API}/public/items/${itemId}`);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
