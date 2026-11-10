-- Supabase Storage bucket + RLS policies for book PDFs.
-- Run once in the Supabase SQL editor (or via the dashboard). This is DB/bucket-side
-- configuration, NOT managed by Prisma migrations.
--
-- Security model:
--   * The bucket is PRIVATE (public = false): no object is readable without a signed URL.
--   * The API server holds the service-role key and generates short-lived signed URLs,
--     but ONLY for ADMIN/LIBRARY callers (enforced in the app, see books.policy.ts).
--   * These RLS policies are a second line of defense at the storage layer: they deny
--     anonymous/user direct access even if an object key leaks.

-- 1) Create a private bucket.
insert into storage.buckets (id, name, public)
values ('book-files', 'book-files', false)
on conflict (id) do nothing;

-- 2) Deny-by-default is automatic with RLS enabled on storage.objects.
--    The service_role key bypasses RLS, so the server can always sign/read/delete.
--    We intentionally add NO policy granting 'anon' or 'authenticated' direct read,
--    so end users can never list or download objects directly — only via a signed URL
--    the server chose to issue.

-- 3) (Optional) If you later want authenticated ADMIN/LIBRARY clients to read directly
--    using their own Supabase JWT (instead of server-issued signed URLs), add a policy
--    keyed on a custom claim, e.g.:
--
-- create policy "privileged read book-files"
--   on storage.objects for select
--   to authenticated
--   using (
--     bucket_id = 'book-files'
--     and (auth.jwt() ->> 'app_role') in ('ADMIN', 'LIBRARY')
--   );
--
--    Leave this out to keep ALL access flowing through server-issued signed URLs.
