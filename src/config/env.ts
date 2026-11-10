import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  // Short-lived access token (JWT) + long-lived opaque refresh token.
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(900), // 15 minutes
  REFRESH_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(1_209_600), // 14 days

  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),
  CORS_ORIGIN: z.string().default('*'),

  // Maximum bounding-box span (degrees). A larger requested box is clamped to this, not rejected.
  MAP_MAX_LAT_SPAN: z.coerce.number().positive().max(180).default(1),
  MAP_MAX_LNG_SPAN: z.coerce.number().positive().max(360).default(1),
  // Hard cap on libraries returned by /libraries/map, to bound memory + response time.
  MAP_MAX_RESULTS: z.coerce.number().int().min(1).max(5000).default(500),

  // ── Supabase Storage (file uploads / signed URLs) ──
  SUPABASE_URL: z.string().url(),
  // Service-role key: server-side only. Never expose to clients.
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_BUCKET: z.string().min(1).default('book-files'),
  // Max accepted upload size (bytes) and signed-URL lifetime.
  MAX_UPLOAD_BYTES: z.coerce.number().int().positive().default(25 * 1024 * 1024), // 25 MB
  SIGNED_URL_TTL_SECONDS: z.coerce.number().int().positive().default(300), // 5 min
  UPLOAD_URL_TTL_SECONDS: z.coerce.number().int().positive().default(120), // 2 min
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment configuration:\n' + z.prettifyError(parsed.error));
  process.exit(1);
}

export const env = parsed.data;
export type Env = z.infer<typeof envSchema>;
export const isProduction = env.NODE_ENV === 'production';
