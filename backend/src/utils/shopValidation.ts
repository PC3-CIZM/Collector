export function validateShopName(name: unknown): boolean {
  if (typeof name !== "string") return false;
  return name.trim().length >= 3;
}
