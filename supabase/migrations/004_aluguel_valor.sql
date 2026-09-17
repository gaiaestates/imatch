-- Campos de preço separados para locação quando finalidade = 'ambos'
-- valor_min/valor_max continuam sendo o preço de venda
-- aluguel_valor_min/max são o preço de aluguel (só usados quando finalidade = 'ambos')
ALTER TABLE demands
  ADD COLUMN IF NOT EXISTS aluguel_valor_min     numeric,
  ADD COLUMN IF NOT EXISTS aluguel_valor_max     numeric,
  ADD COLUMN IF NOT EXISTS aluguel_valor_min_prio text,
  ADD COLUMN IF NOT EXISTS aluguel_valor_max_prio text;
