// ================================================================
// Motor de scoring — compara uma demanda com um imóvel scrapeado
// Retorna score 0–100 com detalhamento critério por critério
// ================================================================

import type { DemandForMatch, ScrapedProperty, MatchScore, CriterionResult, CriterionStatus } from './types'

// Peso de cada nível de prioridade
const WEIGHT: Record<'req' | 'pref' | 'info', number> = {
  req:  3,   // obrigatório: peso alto
  pref: 1,   // preferencial: peso médio
  info: 0.3, // apenas informativo (sem prioridade definida)
}

function prio(p: 'pref' | 'req' | null | undefined): 'req' | 'pref' | 'info' {
  return p === 'req' ? 'req' : p === 'pref' ? 'pref' : 'info'
}

// Normaliza texto de amenidade para comparação
function normalizeAmenity(a: string): string {
  return a.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // remove acentos
    .replace(/[^a-z0-9]/g, ' ')
    .trim()
}

// Verifica se uma amenidade está presente na lista de amenidades do anúncio
function hasAmenity(amenidade: string, propertyAmenidades: string[]): boolean {
  const needle = normalizeAmenity(amenidade.replace(/^\[cond\] /, ''))
  // Palavras-chave a checar (busca parcial)
  const keywords = needle.split(' ').filter(w => w.length > 3)
  const haystack = propertyAmenidades.map(normalizeAmenity).join(' ')
  return keywords.length > 0 && keywords.every(kw => haystack.includes(kw))
}

// Normaliza tipo de imóvel para comparação
function tiposCompativeis(demanda: string, property: string | undefined): boolean {
  if (!property) return false
  const map: Record<string, string[]> = {
    'apartamento': ['apartamento', 'apto', 'ap'],
    'casa': ['casa', 'sobrado', 'residencia'],
    'casa em condominio': ['casa', 'sobrado', 'condominio'],
    'cobertura': ['cobertura', 'cobertura duplex', 'cobertura triplex'],
    'studio': ['studio', 'loft', 'kitnet'],
    'kitnet': ['kitnet', 'studio', 'conjugado'],
    'sala comercial': ['sala', 'conjunto', 'comercial'],
    'galpao': ['galpao', 'industrial', 'deposito'],
  }
  const d = normalizeAmenity(demanda)
  const p = normalizeAmenity(property)
  const synonyms = map[d] ?? [d]
  return synonyms.some(s => p.includes(s))
}

// ---- FUNÇÃO PRINCIPAL ----

export function calcScore(demand: DemandForMatch, property: ScrapedProperty): MatchScore {
  const criteria: CriterionResult[] = []

  function addCriterion(
    label: string,
    priority: 'req' | 'pref' | 'info',
    status: CriterionStatus,
    demand_value?: string,
    found_value?: string,
  ) {
    const w = WEIGHT[priority]
    const max = w * 10
    const earned = status === 'confirmed' ? max : status === 'not_found' ? max * 0.1 : 0 // failed = 0
    criteria.push({ label, status, priority, demand_value, found_value, points_earned: earned, points_max: max })
  }

  // 1. TIPO DE IMÓVEL (sempre avaliado, peso obrigatório)
  const tipoOk = tiposCompativeis(demand.tipo_imovel, property.tipo_imovel)
  addCriterion(
    'Tipo de imóvel',
    'req',
    tipoOk ? 'confirmed' : property.tipo_imovel ? 'failed' : 'not_found',
    demand.tipo_imovel,
    property.tipo_imovel,
  )

  // 2. LOCALIZAÇÃO
  const cidadeOk = demand.cidade && property.cidade &&
    normalizeAmenity(demand.cidade) === normalizeAmenity(property.cidade)
  addCriterion('Cidade', 'req',
    cidadeOk ? 'confirmed' : property.cidade ? 'failed' : 'not_found',
    demand.cidade, property.cidade)

  // Bairro (preferencial se não especificado com req)
  if (demand.bairros && demand.bairros.length > 0) {
    const bairroOk = property.bairro &&
      demand.bairros.some(b => normalizeAmenity(b).includes(normalizeAmenity(property.bairro!)) ||
                                normalizeAmenity(property.bairro!).includes(normalizeAmenity(b)))
    addCriterion('Bairro', 'pref',
      bairroOk ? 'confirmed' : property.bairro ? 'not_found' : 'not_found',
      demand.bairros.join(', '), property.bairro)
  }

  // 3. ÁREA
  if (demand.area_min) {
    const areaVal = property.area_util ?? property.area_total
    const ok = areaVal !== undefined && areaVal >= demand.area_min
    addCriterion(`Área mínima ${demand.area_min}m²`, prio(demand.area_min_prio),
      areaVal === undefined ? 'not_found' : ok ? 'confirmed' : 'failed',
      `≥ ${demand.area_min}m²`, areaVal !== undefined ? `${areaVal}m²` : undefined)
  }
  if (demand.area_max) {
    const areaVal = property.area_util ?? property.area_total
    const ok = areaVal !== undefined && areaVal <= demand.area_max
    addCriterion(`Área máxima ${demand.area_max}m²`, prio(demand.area_max_prio),
      areaVal === undefined ? 'not_found' : ok ? 'confirmed' : 'failed',
      `≤ ${demand.area_max}m²`, areaVal !== undefined ? `${areaVal}m²` : undefined)
  }

  // 4. QUARTOS
  if (demand.quartos_min) {
    const ok = property.quartos !== undefined && property.quartos >= demand.quartos_min
    addCriterion(`Quartos mínimos: ${demand.quartos_min}`, prio(demand.quartos_prio),
      property.quartos === undefined ? 'not_found' : ok ? 'confirmed' : 'failed',
      `≥ ${demand.quartos_min}`, property.quartos !== undefined ? `${property.quartos}` : undefined)
  }

  // 5. SUÍTES
  if (demand.suites_min) {
    const ok = property.suites !== undefined && property.suites >= demand.suites_min
    addCriterion(`Suítes mínimas: ${demand.suites_min}`, prio(demand.suites_prio),
      property.suites === undefined ? 'not_found' : ok ? 'confirmed' : 'failed',
      `≥ ${demand.suites_min}`, property.suites !== undefined ? `${property.suites}` : undefined)
  }

  // 6. BANHEIROS
  if (demand.banheiros_min) {
    const ok = property.banheiros !== undefined && property.banheiros >= demand.banheiros_min
    addCriterion(`Banheiros mínimos: ${demand.banheiros_min}`, prio(demand.banheiros_prio),
      property.banheiros === undefined ? 'not_found' : ok ? 'confirmed' : 'failed',
      `≥ ${demand.banheiros_min}`, property.banheiros !== undefined ? `${property.banheiros}` : undefined)
  }

  // 7. VAGAS
  if (demand.vagas_min) {
    const ok = property.vagas !== undefined && property.vagas >= demand.vagas_min
    addCriterion(`Vagas mínimas: ${demand.vagas_min}`, prio(demand.vagas_prio),
      property.vagas === undefined ? 'not_found' : ok ? 'confirmed' : 'failed',
      `≥ ${demand.vagas_min}`, property.vagas !== undefined ? `${property.vagas}` : undefined)
  }

  // 8. VALOR
  if (demand.valor_min) {
    const ok = property.valor !== undefined && property.valor >= demand.valor_min
    addCriterion(`Valor mínimo R$ ${demand.valor_min.toLocaleString('pt-BR')}`, prio(demand.valor_min_prio),
      property.valor === undefined ? 'not_found' : ok ? 'confirmed' : 'failed',
      `≥ R$ ${demand.valor_min.toLocaleString('pt-BR')}`,
      property.valor !== undefined ? `R$ ${property.valor.toLocaleString('pt-BR')}` : undefined)
  }
  if (demand.valor_max) {
    const ok = property.valor !== undefined && property.valor <= demand.valor_max
    addCriterion(`Valor máximo R$ ${demand.valor_max.toLocaleString('pt-BR')}`, prio(demand.valor_max_prio),
      property.valor === undefined ? 'not_found' : ok ? 'confirmed' : 'failed',
      `≤ R$ ${demand.valor_max.toLocaleString('pt-BR')}`,
      property.valor !== undefined ? `R$ ${property.valor.toLocaleString('pt-BR')}` : undefined)
  }

  // 9. CONDOMÍNIO
  if (demand.cond_max) {
    const ok = property.cond_valor !== undefined && property.cond_valor <= demand.cond_max
    addCriterion(`Condomínio máx. R$ ${demand.cond_max.toLocaleString('pt-BR')}`, prio(demand.cond_prio),
      property.cond_valor === undefined ? 'not_found' : ok ? 'confirmed' : 'failed',
      `≤ R$ ${demand.cond_max.toLocaleString('pt-BR')}`,
      property.cond_valor !== undefined ? `R$ ${property.cond_valor.toLocaleString('pt-BR')}` : undefined)
  }

  // 10. IPTU
  if (demand.iptu_max) {
    const ok = property.iptu_valor !== undefined && property.iptu_valor <= demand.iptu_max
    addCriterion(`IPTU máx. R$ ${demand.iptu_max.toLocaleString('pt-BR')}`, prio(demand.iptu_prio),
      property.iptu_valor === undefined ? 'not_found' : ok ? 'confirmed' : 'failed',
      `≤ R$ ${demand.iptu_max.toLocaleString('pt-BR')}`,
      property.iptu_valor !== undefined ? `R$ ${property.iptu_valor.toLocaleString('pt-BR')}` : undefined)
  }

  // 11. AMENIDADES DO IMÓVEL
  const allAmenidades = [
    ...(demand.amenidades_imovel ?? []),
    ...(demand.amenidades_cond ?? []),
  ]
  for (const { amenity, priority } of allAmenidades) {
    const found = hasAmenity(amenity, property.amenidades)
    addCriterion(amenity.replace(/^\[cond\] /, ''), priority,
      found ? 'confirmed' : 'not_found',
      'presente', found ? 'confirmado no anúncio' : 'não mencionado')
  }

  // ---- CÁLCULO FINAL ----
  const totalMax = criteria.reduce((s, c) => s + c.points_max, 0)
  const totalEarned = criteria.reduce((s, c) => s + c.points_earned, 0)
  const score = totalMax > 0 ? Math.round((totalEarned / totalMax) * 100) : 0

  return {
    total: Math.min(100, score),
    breakdown: criteria,
    confirmed_count: criteria.filter(c => c.status === 'confirmed').length,
    not_found_count: criteria.filter(c => c.status === 'not_found').length,
    failed_count: criteria.filter(c => c.status === 'failed').length,
  }
}
