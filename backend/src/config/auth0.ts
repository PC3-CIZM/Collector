import { env } from "./env";

export const auth0 = {
  issuerBaseURL: `https://${env.AUTH0_DOMAIN}/`,
  audience: env.AUTH0_AUDIENCE,
};

/**
 * Configuration values for the Auth0 Management API. The Management API
 * allows performing administrative tasks such as blocking/unblocking users,
 * updating user metadata, resetting passwords and deleting users. To use
 * these endpoints you must create a machine‑to‑machine application in
 * your Auth0 tenant and configure its client ID, client secret and
 * audience via environment variables. See the README for details.
 */
export const auth0Management = {
  domain: env.AUTH0_DOMAIN,
  clientId: env.AUTH0_MGMT_CLIENT_ID,
  clientSecret: env.AUTH0_MGMT_CLIENT_SECRET,
  audience: env.AUTH0_MGMT_AUDIENCE,
};
