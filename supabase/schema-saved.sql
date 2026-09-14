-- iMatch — tabela de demandas salvas por corretores
-- Execute no SQL Editor do Supabase

CREATE TABLE IF NOT EXISTS public.saved_demands (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  broker_id  uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  demand_id  uuid REFERENCES public.demands(id) ON DELETE CASCADE NOT NULL,
  saved_at   timestamptz DEFAULT now() NOT NULL,
  UNIQUE(broker_id, demand_id)
);

ALTER TABLE public.saved_demands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "saved_select" ON public.saved_demands
  FOR SELECT USING (auth.uid() = broker_id);

CREATE POLICY "saved_insert" ON public.saved_demands
  FOR INSERT WITH CHECK (auth.uid() = broker_id);

CREATE POLICY "saved_delete" ON public.saved_demands
  FOR DELETE USING (auth.uid() = broker_id);

CREATE INDEX IF NOT EXISTS idx_saved_broker ON public.saved_demands(broker_id);
CREATE INDEX IF NOT EXISTS idx_saved_demand ON public.saved_demands(demand_id);
