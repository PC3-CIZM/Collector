import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  PORT: z.coerce.number().default(4000),

  AUTH0_DOMAIN: z.string().min(1),
  AUTH0_AUDIENCE: z.string().url(),

  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().default(5432),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().min(1),
  DB_NAME: z.string().min(1),

  KAFKA_BROKER: z.string().min(1),

  // Auth0 Management API credentials used for administrative actions like blocking
  // or deleting users. These credentials should be provided by your Auth0 tenant.
  AUTH0_MGMT_CLIENT_ID: z.string().min(1),
  AUTH0_MGMT_CLIENT_SECRET: z.string().min(1),
  AUTH0_MGMT_AUDIENCE: z.string().url(),
});

export const env = schema.parse(process.env);
