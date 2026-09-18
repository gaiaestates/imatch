-- 1. Adiciona coluna is_admin ao perfil
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

-- 2. Função auxiliar para verificar se o usuário atual é admin
-- Usada nas políticas RLS de outras tabelas
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

-- 3. Políticas admin para demands
-- Admins podem ver qualquer demanda
CREATE POLICY "admins can select all demands"
  ON public.demands FOR SELECT
  USING (public.is_admin());

-- Admins podem editar qualquer demanda
CREATE POLICY "admins can update all demands"
  ON public.demands FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Admins podem excluir qualquer demanda
CREATE POLICY "admins can delete all demands"
  ON public.demands FOR DELETE
  USING (public.is_admin());

-- 4. Políticas admin para demand_locations
CREATE POLICY "admins can manage all demand_locations"
  ON public.demand_locations FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 5. Políticas admin para demand_amenities
CREATE POLICY "admins can manage all demand_amenities"
  ON public.demand_amenities FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 6. Políticas admin para match_jobs
CREATE POLICY "admins can manage all match_jobs"
  ON public.match_jobs FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 7. Políticas admin para demand_matches
CREATE POLICY "admins can manage all demand_matches"
  ON public.demand_matches FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ==============================================================
-- ATIVAR ADMIN: rode este comando com o user_id do gaiaestates
-- Descubra o ID em: Authentication > Users no Supabase dashboard
-- UPDATE public.profiles SET is_admin = true WHERE id = '<user-id>';
-- ==============================================================
