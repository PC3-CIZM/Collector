import { db } from "../db/pool";

export async function upsertUserFromAuth(auth: any, emailFromClient: string | null) {
  const auth0Id = auth?.sub;
  if (!auth0Id) throw new Error("Missing auth.sub");

  const email =
    typeof emailFromClient === "string" && emailFromClient.includes("@")
      ? emailFromClient
      : null;

  const upsertQ = `
    INSERT INTO users (auth0_id, email)
    VALUES ($1, $2)
    ON CONFLICT (auth0_id)
    DO UPDATE SET
      email = COALESCE(EXCLUDED.email, users.email),
      updated_at = NOW()
    RETURNING id;
  `;

  const { rows: upsertRows } = await db.query(upsertQ, [auth0Id, email]);
  const userId = upsertRows[0]?.id;
  if (!userId) throw new Error("Failed to upsert user");

  // ✅ Re-fetch with roles
  const selectQ = `
    SELECT
      u.id,
      u.auth0_id,
      u.email,
      u.display_name,
      u.is_active,
      COALESCE(array_agg(ur.role) FILTER (WHERE ur.role IS NOT NULL), '{}') AS roles
    FROM users u
    LEFT JOIN user_roles ur ON ur.user_id = u.id
    WHERE u.id = $1
    GROUP BY u.id;
  `;

  const { rows } = await db.query(selectQ, [userId]);
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

