export type TrafficLight = "GREEN" | "ORANGE" | "RED";

export type User = {
  id: number;
  auth0_id: string;
  email: string | null;
  display_name: string | null;
  is_active: boolean;
  roles: string[];
};

export type Category = {
  id: number;
  name: string;
  parent_id: number | null;
  is_active: boolean;
};

export type UserDraft = {
  email: string;
  display_name: string;
  role: "BUYER" | "SELLER";
  is_active: boolean;
};

export type CategoryDraft = {
  name: string;
  parent_id: number | null;
  is_active: boolean;
};

export type CollectorItem = {
  id: number;
  title: string;
  description: string | null;
  price: string;
  shipping_cost: string;
  status: "PENDING_REVIEW" | "PUBLISHED" | "REJECTED" | "DRAFT" | "SOLD";

  shop_name: string;
  seller_name: string | null;
  seller_email: string | null;

  title_status: TrafficLight;
  description_status: TrafficLight;
  images_status: TrafficLight;
  auto_score: number;
  human_status: "PENDING" | "APPROVED" | "REJECTED";

  images: { id: number; url: string; position: number; is_primary: boolean }[];
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

export const providerFromAuth0Id = (auth0Id: string) => auth0Id.split("|")[0] || "unknown";
export const isDatabaseUser = (auth0Id: string) => providerFromAuth0Id(auth0Id) === "auth0";
