-- Status de verificação do CRECI
-- 'pendente'      = ainda não verificado
-- 'ativo'         = COFECI confirmou ativo
-- 'inativo'       = COFECI retornou inativo/suspenso
-- 'nao_encontrado'= CRECI não localizado no COFECI
-- 'erro'          = falha na consulta (tentar novamente)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS creci_status      text DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS creci_verificado_em timestamptz;
