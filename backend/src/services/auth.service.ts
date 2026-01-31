import { db } from "../db/pool";

export async function getDbUserFromAuthSub(authSub: string) {
  const { rows } = await db.query(
    `SELECT id, auth0_id, email, display_name, is_active FROM users WHERE auth0_id = $1`,
    [authSub]
  );
  return rows[0] ?? null;
}
