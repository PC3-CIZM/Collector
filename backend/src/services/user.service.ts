import { db } from "../db/pool";

export async function upsertUserFromAuth(auth: any, emailFromClient: string | null) {
  const auth0Id = auth?.sub;
  if (!auth0Id) throw new Error("Missing auth.sub");

  const email =
    typeof emailFromClient === "string" && emailFromClient.includes("@")
      ? emailFromClient
      : null;

  const q = `
    INSERT INTO users (auth0_id, email)
    VALUES ($1, $2)
    ON CONFLICT (auth0_id)
    DO UPDATE SET
      email = COALESCE(EXCLUDED.email, users.email),
      updated_at = NOW()
    RETURNING *;
  `;

  const { rows } = await db.query(q, [auth0Id, email]);
  return rows[0];
}

export async function assignInitialRoleIfMissing(
  userId: number,
  role: "BUYER" | "SELLER"
) {
  await db.query(
    `
    INSERT INTO user_roles (user_id, role)
    SELECT $1, $2
    WHERE NOT EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = $1
    )
    `,
    [userId, role]
  );
}

