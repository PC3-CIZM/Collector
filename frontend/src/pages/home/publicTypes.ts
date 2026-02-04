export type PublicItemRow = {
  id: number;
  title: string;
  description: string | null;
  price: string;
  shipping_cost: string;
  currency: string;
  shop_id: number;
  shop_name: string;
  cover_url: string | null;
};

export type PublicItemDetail = {
  item: {
    id: number;
    title: string;
    description: string | null;
    price: string;
    shipping_cost: string;
    currency: string;
    shop_id: number;
    category_id: number | null;
    created_at: string;
    updated_at: string;
  };
  shop: {
    id: number;
    name: string;
    description: string | null;
    logo_url: string | null;
    owner_id: number;
  };
  seller: {
    id: number;
    display_name: string | null;
  };
  images: { id: number; url: string; position: number; is_primary: boolean }[];
};
