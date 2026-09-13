-- ================================================================
-- iMatch — tabelas de matching imobiliário
-- Execute no SQL Editor do Supabase
-- ================================================================

-- Imóveis encontrados pelos scrapers
CREATE TABLE IF NOT EXISTS public.scraped_properties (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  portal        text NOT NULL,        -- 'zap' | 'imovelweb' | 'pilar' | 'jardins' | 'axpe'
  portal_id     text,                 -- ID do imóvel no portal
  url           text NOT NULL,
  title         text,
  tipo_imovel   text,
  estado        text,
  cidade        text,
  bairro        text,
  endereco      text,
  area_util     numeric,
  area_total    numeric,
  quartos       int,
  suites        int,
  banheiros     int,
  vagas         int,
  valor         numeric,
  cond_valor    numeric,
  iptu_valor    numeric,
  finalidade    text,                 -- 'compra' | 'aluguel'
  amenidades    text[],               -- lista de amenidades encontradas no anúncio
  descricao     text,
  imagens       text[],
  raw_data      jsonb,                -- resposta bruta do portal
  scraped_at    timestamptz DEFAULT now() NOT NULL,
  UNIQUE(portal, portal_id)
);

ALTER TABLE public.scraped_properties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "properties_select" ON public.scraped_properties FOR SELECT USING (true);

-- Resultados de matching entre demanda e imóvel
CREATE TABLE IF NOT EXISTS public.demand_matches (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  demand_id     uuid REFERENCES public.demands(id) ON DELETE CASCADE NOT NULL,
  property_id   uuid REFERENCES public.scraped_properties(id) ON DELETE CASCADE NOT NULL,
  score         int NOT NULL CHECK (score BETWEEN 0 AND 100),
  score_details jsonb NOT NULL,       -- detalhamento por critério
  status        text DEFAULT 'novo',  -- 'novo' | 'visto' | 'salvo' | 'descartado'
  matched_at    timestamptz DEFAULT now() NOT NULL,
  UNIQUE(demand_id, property_id)
);

ALTER TABLE public.demand_matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "matches_select" ON public.demand_matches FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.demands d WHERE d.id = demand_id AND (d.visibilidade = 'todos' OR auth.uid() = d.broker_id)));
CREATE POLICY "matches_update" ON public.demand_matches FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.demands d WHERE d.id = demand_id AND auth.uid() = d.broker_id));

-- Log de execução dos jobs de scraping
CREATE TABLE IF NOT EXISTS public.match_jobs (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  demand_id   uuid REFERENCES public.demands(id) ON DELETE CASCADE NOT NULL,
  status      text DEFAULT 'pending',  -- 'pending' | 'running' | 'done' | 'error'
  portals     text[],                  -- portais executados neste job
  total_found int DEFAULT 0,
  started_at  timestamptz,
  finished_at timestamptz,
  error       text,
  created_at  timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.match_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "jobs_select" ON public.match_jobs FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.demands d WHERE d.id = demand_id AND auth.uid() = d.broker_id));

-- Índices
CREATE INDEX IF NOT EXISTS idx_matches_demand  ON public.demand_matches(demand_id);
CREATE INDEX IF NOT EXISTS idx_matches_score   ON public.demand_matches(demand_id, score DESC);
CREATE INDEX IF NOT EXISTS idx_matches_status  ON public.demand_matches(demand_id, status);
CREATE INDEX IF NOT EXISTS idx_props_portal    ON public.scraped_properties(portal, portal_id);
CREATE INDEX IF NOT EXISTS idx_props_cidade    ON public.scraped_properties(cidade, estado);
CREATE INDEX IF NOT EXISTS idx_jobs_demand     ON public.match_jobs(demand_id, created_at DESC);
