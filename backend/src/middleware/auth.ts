import { expressjwt as jwt } from "express-jwt";
import jwksRsa from "jwks-rsa";
import { auth0 } from "../config/auth0";

export const requireAuth = jwt({
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 10,
    jwksUri: `${auth0.issuerBaseURL}.well-known/jwks.json`,
  }) as any,
  audience: auth0.audience,
  issuer: auth0.issuerBaseURL,
  algorithms: ["RS256"],
});
