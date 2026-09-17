-- Adiciona colunas de avatar, imobiliária e autônomo ao perfil
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS avatar_url  TEXT,
  ADD COLUMN IF NOT EXISTS imobiliaria TEXT,
  ADD COLUMN IF NOT EXISTS autonomo    BOOLEAN DEFAULT FALSE;

-- Bucket avatars: criar via Supabase Dashboard > Storage > New bucket
-- Nome: avatars  |  Public: true
-- Policy upload: authenticated users podem fazer upload em seu próprio path
-- Policy read: público (public bucket)
