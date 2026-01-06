import { env } from "./env";

export const auth0 = {
  issuerBaseURL: `https://${env.AUTH0_DOMAIN}/`,
  audience: env.AUTH0_AUDIENCE,
};
