-- ============================================================================
-- Mindfolio — tek seferde çalıştırılan veritabanı kurulum/onarım scripti
-- Supabase Dashboard → SQL Editor → TAMAMINI yapıştır → Run.
-- Güvenli ve tekrar çalıştırılabilir (idempotent): birden çok kez çalıştırmak
-- mükerrer kayıt OLUŞTURMAZ. Önceki scriptleri temizlemene gerek yok.
--
-- Yaptıkları:
--   1) ideas / drafts / content tablolarını doğru şemayla garanti eder + RLS.
--   2) Eski (uyumsuz) ideas tablosunu yedeğe taşır ve BOOKMARK'LARINI geri yükler.
--   3) Yanlışlıkla "Idea" olarak kaydedilmiş blog taslaklarını Content'e taşır.
--   4) Eski "drafts" tablosundaki taslakları Content'e aktarır.
-- ============================================================================

-- 0) Eski/uyumsuz ideas tablosunu (id=bigint, user_id YOK) yedeğe taşı.
--    Yalnızca user_id kolonu yoksa, yani şema yanlışsa çalışır. VERİ KAYBI YOK.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'ideas'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ideas' AND column_name = 'user_id'
  ) THEN
    DROP TABLE IF EXISTS ideas_legacy_backup;
    EXECUTE 'ALTER TABLE ideas RENAME TO ideas_legacy_backup';
  END IF;
END $$;

-- 1) Doğru `ideas` tablosu (uuid id + user_id)
CREATE TABLE IF NOT EXISTS ideas (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  content     TEXT,
  url         TEXT,
  source_type TEXT DEFAULT 'note',
  tags        TEXT[] DEFAULT '{}',
  pillar      TEXT,
  preview     JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2) drafts güvence + idea_id FK
ALTER TABLE drafts ADD COLUMN IF NOT EXISTS idea_id UUID;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'drafts_idea_id_fkey') THEN
    ALTER TABLE drafts
      ADD CONSTRAINT drafts_idea_id_fkey
      FOREIGN KEY (idea_id) REFERENCES ideas(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 3) content tablosu güvence + body kolonu (taslak gövdesi)
CREATE TABLE IF NOT EXISTS content (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  category     TEXT,
  tags         TEXT[] DEFAULT '{}',
  notes        TEXT,
  body         TEXT,
  scheduled_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE content ADD COLUMN IF NOT EXISTS body TEXT;

-- 4) RLS + politikalar
ALTER TABLE ideas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own ideas"   ON ideas;
DROP POLICY IF EXISTS "Users can insert own ideas" ON ideas;
DROP POLICY IF EXISTS "Users can update own ideas" ON ideas;
DROP POLICY IF EXISTS "Users can delete own ideas" ON ideas;
CREATE POLICY "Users can view own ideas"   ON ideas FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own ideas" ON ideas FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own ideas" ON ideas FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own ideas" ON ideas FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE drafts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own drafts"   ON drafts;
DROP POLICY IF EXISTS "Users can insert own drafts" ON drafts;
DROP POLICY IF EXISTS "Users can update own drafts" ON drafts;
DROP POLICY IF EXISTS "Users can delete own drafts" ON drafts;
CREATE POLICY "Users can view own drafts"   ON drafts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own drafts" ON drafts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own drafts" ON drafts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own drafts" ON drafts FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE content ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own content"   ON content;
DROP POLICY IF EXISTS "Users can insert own content" ON content;
DROP POLICY IF EXISTS "Users can update own content" ON content;
DROP POLICY IF EXISTS "Users can delete own content" ON content;
CREATE POLICY "Users can view own content"   ON content FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own content" ON content FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own content" ON content FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own content" ON content FOR DELETE USING (auth.uid() = user_id);

-- 5) BOOKMARK'LARI GERİ YÜKLE: ideas_legacy_backup'taki kayıtları yeni ideas'a kopyala.
--    user_id, hesabındaki ilk kullanıcıya atanır (tek kullanıcılı geliştirme DB'si varsayımı).
--    Tek kullanıcı değilsen: aşağıdaki LIMIT 1 yerine
--      (SELECT id FROM auth.users WHERE email = 'SENIN_EMAILIN')
--    kullan. Hata olursa adım atlanır, script durmaz.
DO $$
DECLARE
  uid uuid;
  has_url     boolean;
  has_content boolean;
  has_created boolean;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='ideas_legacy_backup')
     AND EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='ideas_legacy_backup' AND column_name='title') THEN

    SELECT id INTO uid FROM auth.users ORDER BY created_at ASC LIMIT 1;
    IF uid IS NULL THEN RETURN; END IF;

    has_url     := EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema='public' AND table_name='ideas_legacy_backup' AND column_name='url');
    has_content := EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema='public' AND table_name='ideas_legacy_backup' AND column_name='content');
    has_created := EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema='public' AND table_name='ideas_legacy_backup' AND column_name='created_at');

    BEGIN
      -- Insert missing bookmarks, preserving the original created_at when available.
      EXECUTE format(
        'INSERT INTO ideas (user_id, title, url, content, source_type, created_at)
         SELECT %L::uuid, b.title::text, %s, %s, ''note'', %s
         FROM ideas_legacy_backup b
         WHERE b.title IS NOT NULL AND b.title::text <> ''''
           AND NOT EXISTS (
             SELECT 1 FROM ideas i WHERE i.user_id = %L::uuid AND i.title = b.title::text
           )',
        uid,
        CASE WHEN has_url     THEN 'b.url::text'     ELSE 'NULL::text' END,
        CASE WHEN has_content THEN 'b.content::text' ELSE 'NULL::text' END,
        CASE WHEN has_created THEN 'b.created_at::timestamptz' ELSE 'now()' END,
        uid
      );

      -- Re-sync dates onto bookmarks that were restored earlier with today's date.
      IF has_created THEN
        EXECUTE format(
          'UPDATE ideas i
             SET created_at = b.created_at::timestamptz
           FROM ideas_legacy_backup b
           WHERE i.user_id = %L::uuid AND i.title = b.title::text
             AND b.created_at IS NOT NULL',
          uid
        );
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Bookmark geri yükleme atlandı: %', SQLERRM;
    END;
  END IF;
END $$;

-- 6) Yanlışlıkla Idea olarak kaydedilen blog taslaklarını Content'e taşı.
INSERT INTO content (user_id, title, body, category, tags, created_at)
SELECT user_id, COALESCE(NULLIF(title, ''), 'Untitled draft'), content, 'Blog', COALESCE(tags, '{}'), created_at
FROM ideas
WHERE source_type IN ('audio', 'generated');

DELETE FROM ideas WHERE source_type IN ('audio', 'generated');

-- 7) Eski drafts tablosundaki taslakları Content'e aktar (mükerrer kontrollü).
INSERT INTO content (user_id, title, body, category, created_at)
SELECT d.user_id, COALESCE(NULLIF(d.title, ''), 'Untitled draft'), d.content, 'Blog', d.created_at
FROM drafts d
WHERE d.content IS NOT NULL AND d.content <> ''
  AND NOT EXISTS (
    SELECT 1 FROM content c WHERE c.user_id = d.user_id AND c.body = d.content
  );

-- 7b) Tarih eşitleme: daha önce uygulamadan "Save to Content" ile bugünün tarihiyle
--     kaydedilmiş içerikleri, eşleşen orijinal draft'ın tarihine geri çek.
UPDATE content c
SET created_at = d.created_at
FROM drafts d
WHERE c.user_id = d.user_id
  AND c.body = d.content
  AND d.created_at IS NOT NULL
  AND c.created_at <> d.created_at;

-- 8) PostgREST şema cache'ini yenile
NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- (İSTEĞE BAĞLI) TANI: tarihlerin korunup korunmadığını görmek için bunları
-- ayrı ayrı çalıştırıp çıktıyı bana iletebilirsin:
--   SELECT title, created_at FROM content      ORDER BY created_at;
--   SELECT title, created_at FROM drafts        ORDER BY created_at;
--   SELECT * FROM ideas_legacy_backup LIMIT 10;   -- created_at kolonu var mı?
-- ============================================================================
