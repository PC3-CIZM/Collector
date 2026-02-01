import type { Category, User } from "./adminTypes";

const API_BASE = import.meta.env.VITE_API_URL;

export async function apiFetch<T>(
  path: string,
  token: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(await res.text());
  // Some endpoints may return 204
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export async function fetchUsers(token: string) {
  return apiFetch<User[]>("/admin/users", token);
}

export async function fetchCategories(token: string) {
  return apiFetch<Category[]>("/admin/categories", token);
}

export async function updateUserRole(token: string, userId: number, role: string) {
  return apiFetch<void>(`/admin/users/${userId}/role`, token, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role }),
  });
}

export async function updateUserActive(token: string, userId: number, isActive: boolean) {
  return apiFetch<void>(`/admin/users/${userId}/active`, token, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive }),
  });
}

export async function updateUserDisplayName(token: string, userId: number, displayName: string) {
  return apiFetch<{ displayName: string }>(`/admin/users/${userId}/display-name`, token, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ displayName }),
  });
}

export async function updateUserEmail(token: string, userId: number, email: string) {
  return apiFetch<void>(`/admin/users/${userId}/email`, token, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
}

export async function updateUserPassword(token: string, userId: number, password: string) {
  return apiFetch<void>(`/admin/users/${userId}/password`, token, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
}

export async function deleteUser(token: string, userId: number) {
  const res = await fetch(`${API_BASE}/admin/users/${userId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok && res.status !== 204) throw new Error(await res.text());
}

export async function createCategory(token: string, name: string) {
  return apiFetch<Category>("/admin/categories", token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
}

export async function updateCategory(token: string, id: number, patch: Partial<Category>) {
  return apiFetch<Category>(`/admin/categories/${id}`, token, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
}

export async function deactivateCategory(token: string, id: number) {
  return apiFetch<Category>(`/admin/categories/${id}`, token, {
    method: "DELETE",
  });
}

async function req<T>(url: string, token: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function fetchCollectorQueue(token: string) {
  return req(`${API_BASE}/admin/collector/items`, token);
}

export async function fetchCollectorItemDetail(token: string, itemId: number) {
  return req(`${API_BASE}/admin/collector/items/${itemId}`, token);
}

export async function fetchCollectorItemReviews(token: string, itemId: number) {
  return req(`${API_BASE}/admin/collector/items/${itemId}/reviews`, token);
}

export async function reviewCollectorItem(
  token: string,
  itemId: number,
  body: {
    decision: "PUBLISHED" | "REJECTED";
    notes: string;
    traffic_photo: "GREEN" | "ORANGE" | "RED";
    traffic_title: "GREEN" | "ORANGE" | "RED";
    traffic_description: "GREEN" | "ORANGE" | "RED";
  }
) {
  return req(`${API_BASE}/admin/collector/items/${itemId}/review`, token, {
    method: "POST",
    body: JSON.stringify(body),
  });
}