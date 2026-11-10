/**
 * Sets the environment BEFORE any source module loads (config/env.ts validates on import
 * and exits the process if required vars are missing). Referenced via jest `setupFiles`.
 */

process.env["NODE_ENV"] = "test";
process.env["DATABASE_URL"] =
  "postgresql://user:pass@localhost:5432/test?schema=public";
process.env["JWT_SECRET"] =
  "test-secret-that-is-definitely-at-least-32-characters-long";
process.env["ACCESS_TOKEN_TTL_SECONDS"] = "900";
process.env["REFRESH_TOKEN_TTL_SECONDS"] = "1209600";
process.env["SUPABASE_URL"] = "https://test-project.supabase.co";
process.env["SUPABASE_SERVICE_ROLE_KEY"] = "test-service-role-key";
process.env["SUPABASE_BUCKET"] = "book-files";
process.env["MAP_MAX_LAT_SPAN"] = "1";
process.env["MAP_MAX_LNG_SPAN"] = "1";
process.env["MAP_MAX_RESULTS"] = "500";
