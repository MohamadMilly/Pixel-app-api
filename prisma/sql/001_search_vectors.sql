-- Full-text search (PostgreSQL tsvector) for Book and Library.
--
-- These are GENERATED columns: Postgres derives them from the source columns and
-- keeps them in sync automatically, so the search index can never drift from the
-- data (single source of truth = the title / location columns themselves).
--
-- HOW TO APPLY (Prisma 7):
--   1. Add the `searchVector Unsupported("tsvector")?` fields (already in schema.prisma).
--   2. Create the migration WITHOUT applying it:
--          npx prisma migrate dev --create-only --name search_vectors
--   3. In the generated migration.sql, REPLACE the two lines that look like
--          ALTER TABLE "Book"    ADD COLUMN "searchVector" tsvector;
--          ALTER TABLE "Library" ADD COLUMN "searchVector" tsvector;
--      with the contents of this file, then run:
--          npx prisma migrate dev
--   Because the column is declared in schema.prisma, Prisma will not drop it on
--   future migrations; because it is GENERATED, no trigger or app code maintains it.

-- 'simple' config = lowercasing + tokenization without language stemming,
-- which behaves predictably for mixed/!English content.

ALTER TABLE "Book"
  DROP COLUMN IF EXISTS "searchVector";
ALTER TABLE "Book"
  ADD COLUMN "searchVector" tsvector
  GENERATED ALWAYS AS (to_tsvector('simple', coalesce("title", ''))) STORED;
CREATE INDEX IF NOT EXISTS "Book_searchVector_idx" ON "Book" USING GIN ("searchVector");

ALTER TABLE "Library"
  DROP COLUMN IF EXISTS "searchVector";
ALTER TABLE "Library"
  ADD COLUMN "searchVector" tsvector
  GENERATED ALWAYS AS (
    to_tsvector('simple', coalesce("title", '') || ' ' || coalesce("location", ''))
  ) STORED;
CREATE INDEX IF NOT EXISTS "Library_searchVector_idx" ON "Library" USING GIN ("searchVector");
