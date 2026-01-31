export type Category = { id: number; name: string; parent_id: number | null; is_active: boolean };

export type Shop = {
  id: number;
  owner_id: number;
  name: string;
  description: string | null;
  logo_url: string | null;
  is_active: boolean;
  created_at: string;
};

export type ItemImage = {
  id: number;
  url: string;
  position: number;
  is_primary: boolean;
};

export type Item = {
  id: number;
  shop_id: number;
  category_id: number | null;
  title: string;
  description: string | null;
  price: string;
  shipping_cost: string;
  status: "DRAFT" | "PENDING_REVIEW" | "PUBLISHED" | "REJECTED" | "SOLD";
  images: ItemImage[];
  updated_at: string;
};

export type ItemReview = {
  id: number;
  decision: "PUBLISHED" | "REJECTED";
  notes: string;
  traffic_photo: "GREEN" | "ORANGE" | "RED";
  traffic_title: "GREEN" | "ORANGE" | "RED";
  traffic_description: "GREEN" | "ORANGE" | "RED";
  created_at: string;
  admin_name?: string | null;
};

export type SellerItemRow = {
  id: number;
  title: string;
  status: "DRAFT" | "PENDING_REVIEW" | "PUBLISHED" | "REJECTED" | "SOLD";
  price: string;
  shipping_cost: string;
  category_id: number | null;
  category_name?: string | null;
  cover_url?: string | null;
  last_review?: ItemReview | null;
};