import axios from "axios";
import { auth0Management } from "../config/auth0";

// In‑memory cache for the management API token. Auth0 management tokens are
// typically short lived (e.g. 24 hours). We store the token and its expiry
// time so that subsequent calls re‑use the token until it expires.
let cachedToken: string | null = null;
let cachedExpiry = 0;

/**
 * Obtain a management API token from Auth0 via the client credentials grant.
 *
 * The token is automatically cached until its expiry minus 60 seconds. If
 * another call is made before the cache expires, the cached token is
 * returned. This avoids unnecessary token requests.
 */
async function getManagementToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedExpiry > now) {
    return cachedToken;
  }
  const tokenUrl = `https://${auth0Management.domain}/oauth/token`;
  const resp = await axios.post(tokenUrl, {
    grant_type: "client_credentials",
    client_id: auth0Management.clientId,
    client_secret: auth0Management.clientSecret,
    audience: auth0Management.audience,
  });
  const { access_token, expires_in } = resp.data;
  cachedToken = access_token;
  // Subtract 60s to force refresh a bit earlier
  cachedExpiry = now + (expires_in - 60) * 1000;
  return cachedToken!;
}

/**
 * Helper to call the Auth0 Management API. Automatically attaches the
 * management token in the Authorization header.
 */
async function auth0Request(method: "get" | "post" | "patch" | "delete", path: string, data?: any) {
  const token = await getManagementToken();
  const url = `https://${auth0Management.domain}/api/v2${path}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  return axios.request({ method, url, data, headers });
}

/**
 * Update fields on an Auth0 user. Accepts any field supported by the
 * Auth0 PATCH /api/v2/users/:id endpoint, such as `blocked`, `email`,
 * `password`, etc. See the Auth0 documentation for a full list.
 *
 * @param auth0Id The Auth0 user ID (e.g. "auth0|abc123")
 * @param data Fields to update
 */
export async function updateAuth0User(auth0Id: string, data: any) {
  return auth0Request("patch", `/users/${encodeURIComponent(auth0Id)}`, data);
}

/**
 * Permanently delete a user from Auth0. This action cannot be undone.
 */
export async function deleteAuth0User(auth0Id: string) {
  return auth0Request("delete", `/users/${encodeURIComponent(auth0Id)}`);
}

/**
 * Block or unblock an Auth0 user. When a user is blocked they cannot
 * authenticate and will receive an error when attempting to log in.
 */
export async function setAuth0UserBlocked(auth0Id: string, blocked: boolean) {
  return updateAuth0User(auth0Id, { blocked });
}

/**
 * Change a user's password in Auth0. Note that Auth0 does not return the
 * user object after this operation, so there is no response body.
 */
export async function changeAuth0UserPassword(auth0Id: string, newPassword: string) {
  return updateAuth0User(auth0Id, { password: newPassword });
}

/**
 * Change a user's email in Auth0. If email verification is enabled in
 * Auth0, the user will receive a verification email at the new address.
 */
export async function changeAuth0UserEmail(auth0Id: string, newEmail: string) {
  return updateAuth0User(auth0Id, { email: newEmail });
}


export async function getAuth0User(userId: string) {
  const token = await getManagementToken();
  const url = `https://${auth0Management.domain}/api/v2/users/${encodeURIComponent(userId)}`;
  const res = await axios.get(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

export async function getAuth0UserProvider(userId: string): Promise<string> {
  // Preferred: read provider from Auth0 identities
  const u = await getAuth0User(userId);
  const provider = u?.identities?.[0]?.provider;
  if (typeof provider === "string" && provider.length > 0) return provider;

  // Fallback: derive from id format "provider|xxxxx"
  return String(userId).split("|")[0] || "unknown";
}

export async function assertAuth0DatabaseUser(userId: string) {
  const provider = await getAuth0UserProvider(userId);
  if (provider !== "auth0") {
    const err: any = new Error(
      `Operation not allowed for provider "${provider}". Email/password must be managed by the identity provider.`
    );
    err.status = 403;
    err.code = "PROVIDER_NOT_ALLOWED";
    throw err;
  }
}
