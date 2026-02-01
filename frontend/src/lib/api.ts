export async function apiGetMe(token: string) {
  const res = await fetch(`${import.meta.env.VITE_API_URL}/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function apiSetDisplayName(token: string, displayName: string) {
  const res = await fetch(`${import.meta.env.VITE_API_URL}/me/display-name`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ displayName }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
