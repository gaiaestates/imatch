// ================================================================
// Tipos centrais do sistema de matching iMatch
// ================================================================

export type Portal = 'zap' | 'imovelweb' | 'pilar' | 'jardins' | 'axpe'

// Imóvel scrapeado de um portal
export interface ScrapedProperty {
  portal: Portal
  portal_id: string
  url: string
  title?: string
  tipo_imovel?: string
  estado?: string
  cidade?: string
  bairro?: string
  endereco?: string
  area_util?: number
  area_total?: number
  quartos?: number
  suites?: number
  banheiros?: number
  vagas?: number
  valor?: number
  cond_valor?: number
  iptu_valor?: number
  finalidade: 'compra' | 'aluguel'
  amenidades: string[]      // amenidades detectadas no anúncio
  descricao?: string
  imagens?: string[]
  raw_data?: Record<string, unknown>
}

// Demanda normalizada para o motor de matching
export interface DemandForMatch {
  id: string
  finalidade: 'compra' | 'aluguel'
  tipo_imovel: string
  estado?: string
  cidade?: string
  bairros?: string[]       // da tabela demand_locations
  area_min?: number
  area_max?: number
  area_min_prio?: 'pref' | 'req' | null
  area_max_prio?: 'pref' | 'req' | null
  quartos_min?: number
  quartos_prio?: 'pref' | 'req' | null
  suites_min?: number
  suites_prio?: 'pref' | 'req' | null
  banheiros_min?: number
  banheiros_prio?: 'pref' | 'req' | null
  vagas_min?: number
  vagas_prio?: 'pref' | 'req' | null
  valor_min?: number
  valor_max?: number
  valor_min_prio?: 'pref' | 'req' | null
  valor_max_prio?: 'pref' | 'req' | null
  cond_max?: number
  cond_prio?: 'pref' | 'req' | null
  iptu_max?: number
  iptu_prio?: 'pref' | 'req' | null
  amenidades_imovel?: Array<{ amenity: string; priority: 'pref' | 'req' }>
  amenidades_cond?: Array<{ amenity: string; priority: 'pref' | 'req' }>
}

// Resultado de cada critério avaliado
export type CriterionStatus = 'confirmed' | 'not_found' | 'failed' | 'not_applicable'

export interface CriterionResult {
  label: string            // "3 quartos mínimos"
  status: CriterionStatus
  priority: 'req' | 'pref' | 'info'
  demand_value?: string    // o que o cliente pediu
  found_value?: string     // o que o anúncio diz
  points_earned: number
  points_max: number
}

// Score final com detalhamento
export interface MatchScore {
  total: number            // 0–100
  breakdown: CriterionResult[]
  confirmed_count: number
  not_found_count: number
  failed_count: number     // critérios obrigatórios não atendidos
}
