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

export const providerFromAuth0Id = (auth0Id: string) => auth0Id.split("|")[0] || "unknown";
export const isDatabaseUser = (auth0Id: string) => providerFromAuth0Id(auth0Id) === "auth0";
