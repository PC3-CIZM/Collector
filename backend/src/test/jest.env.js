// PORT (pas obligatoire, mais propre)
process.env.PORT = "4000";

// Auth0 : valeurs "fake" mais valides (juste pour passer la validation)
process.env.AUTH0_DOMAIN = "example.auth0.com";
process.env.AUTH0_AUDIENCE = "https://api.example.com/";
process.env.AUTH0_MGMT_CLIENT_ID = "dummy";
process.env.AUTH0_MGMT_CLIENT_SECRET = "dummy";
process.env.AUTH0_MGMT_AUDIENCE = "https://api.example.com/";

// DB : pour le TEST 1, la DB n’est pas utilisée, mais env.ts l’exige
process.env.DB_HOST = "localhost";
process.env.DB_PORT = "5432";
process.env.DB_USER = "postgres";
process.env.DB_PASSWORD = "postgres";
process.env.DB_NAME = "collector_db";

// Autres
process.env.FRONTEND_URL = "http://localhost:3000";
process.env.CONTENT_CHECK_URL = "https://api.example.com/content-check";
