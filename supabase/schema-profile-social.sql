-- Adiciona campos de redes sociais e bio ao perfil do corretor
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS instagram TEXT,
  ADD COLUMN IF NOT EXISTS linkedin  TEXT,
  ADD COLUMN IF NOT EXISTS bio       TEXT;
