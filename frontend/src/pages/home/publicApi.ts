const API = import.meta.env.VITE_API_URL;

async function json<T>(r: Response): Promise<T> {
  if (!r.ok) throw new Error(await r.text());
  // Some endpoints could return 204
  if (r.status === 204) return undefined as T;
  return r.json() as Promise<T>;
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

export type PublicItemDetail = {
  item: {
    id: number;
    shop_id: number;
    category_id: number | null;
    title: string;
    description: string | null;
    price: string | number;
    currency: string;
    shipping_cost: string | number;
    status: "PUBLISHED";
    created_at: string;
    updated_at: string;
  };
  shop: {
    id: number;
    owner_id: number;
    name: string;
    description: string | null;
    logo_url: string | null;
    seller_name: string | null;
  };
  images: {
    id: number;
    item_id: number;
    url: string;
    position: number;
    is_primary: boolean;
  }[];
};


export type ShopSearchResult = {
  shop_id: number;
  shop_name: string;
  shop_logo_url: string | null;
  seller_id: number;
  seller_name: string | null;
};

export type SellerSearchResult = {
  seller_id: number;
  seller_name: string | null;
  shops_count?: number;
};

export type ItemSearchResult = {
  id: number;
  title: string;
  price: string | number;
  currency?: string;
  shipping_cost?: string | number;
  cover_url: string | null;
  shop_id: number;
  shop_name: string;
  seller_id: number;
};

export type SearchAllResult = {
  items: ItemSearchResult[];
  shops: ShopSearchResult[];
  sellers: SellerSearchResult[];
};

export async function fetchPublicItems(params: { limit?: number; cursor?: string | null }) {
  const url = new URL(`${API}/public/items`);
  if (params.limit) url.searchParams.set("limit", String(params.limit));
  if (params.cursor) url.searchParams.set("cursor", params.cursor);
  return json<PublicItemsPage>(await fetch(url.toString()));
}

export async function fetchShopDetail(shopId: number) {
  return json<PublicShopDetail>(await fetch(`${API}/public/shops/${shopId}`));
}

export async function fetchSellerDetail(sellerId: number) {
  return json<PublicSellerDetail>(await fetch(`${API}/public/sellers/${sellerId}`));
}

export async function fetchPublicItemDetail(itemId: number) {
  return json<PublicItemDetail>(await fetch(`${API}/public/items/${itemId}`));
}

/**
 * Suggestions (as-you-type) — accepte AbortSignal
 * Backend: GET /public/search/suggest?q=...
 */
export async function searchSuggest(
  q: string,
  opts?: { signal?: AbortSignal }
): Promise<SearchAllResult> {
  const r = await fetch(`${API}/public/search/suggest?q=${encodeURIComponent(q)}`, {
    signal: opts?.signal,
  });
  return json<SearchAllResult>(r);
}

/**
 * Recherche complète (bouton "Rechercher")
 * Backend: GET /public/search?q=...
 */
export async function searchAll(q: string): Promise<SearchAllResult> {
  return json<SearchAllResult>(await fetch(`${API}/public/search?q=${encodeURIComponent(q)}`));
}

/**
 * Compat: si tu as encore du code qui appelle searchShops(),
 * on le mappe sur searchSuggest() (ou searchAll si tu préfères).
 * -> Ça évite de casser ton HomePage.
 */
export async function searchShops(
  q: string,
  opts?: { signal?: AbortSignal }
): Promise<ShopSearchResult[]> {
  const r = await searchSuggest(q, opts);
  return r.shops ?? [];
}
