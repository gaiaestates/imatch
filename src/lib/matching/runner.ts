// ================================================================
// Runner — orquestra todos os scrapers e salva resultados no Supabase
// ================================================================

import { createClient } from '@supabase/supabase-js'
import type { DemandForMatch, ScrapedProperty } from './types'
import { calcScore } from './score'
import { scrapeZap, buildZapSiteUrl } from './portals/zap'
import { scrapeImovelWeb, buildImovelWebSiteUrl } from './portals/imovelweb'
import { scrapePilar, scrapeJardins, scrapeAxpe, buildPilarUrl, buildJardinsUrl, buildAxpeUrl } from './portals/boutique'

// Cria cliente Supabase com service role para o runner (server-side only)
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

// URLs de busca para cada portal (para mostrar ao corretor mesmo sem scraping)
export function getPortalSearchUrls(demand: DemandForMatch): Record<string, string> {
  return {
    zap: buildZapSiteUrl(demand),
    imovelweb: buildImovelWebSiteUrl(demand),
    pilar: buildPilarUrl(demand),
    jardins: buildJardinsUrl(demand),
    axpe: buildAxpeUrl(demand),
  }
}

// Busca a demanda completa do Supabase (inclui bairros e amenidades)
export async function loadDemandForMatch(demandId: string): Promise<DemandForMatch | null> {
  const supabase = getSupabaseAdmin()

  const { data: demand } = await supabase
    .from('demands')
    .select('*')
    .eq('id', demandId)
    .single()

  if (!demand) return null

  const { data: locations } = await supabase
    .from('demand_locations')
    .select('type, value')
    .eq('demand_id', demandId)
    .eq('type', 'bairro')

  const { data: amenidades } = await supabase
    .from('demand_amenities')
    .select('amenity, priority')
    .eq('demand_id', demandId)

  return {
    id: demand.id,
    finalidade: demand.finalidade,
    tipo_imovel: demand.tipo_imovel,
    estado: demand.estado,
    cidade: demand.cidade,
    bairros: locations?.map((l: any) => l.value) ?? [],
    area_min: demand.area_min,
    area_max: demand.area_max,
    area_min_prio: demand.area_min_prio,
    area_max_prio: demand.area_max_prio,
    quartos_min: demand.quartos_min,
    quartos_prio: demand.quartos_prio,
    suites_min: demand.suites_min,
    suites_prio: demand.suites_prio,
    banheiros_min: demand.banheiros_min,
    banheiros_prio: demand.banheiros_prio,
    vagas_min: demand.vagas_min,
    vagas_prio: demand.vagas_prio,
    valor_min: demand.valor_min,
    valor_max: demand.valor_max,
    valor_min_prio: demand.valor_min_prio,
    valor_max_prio: demand.valor_max_prio,
    cond_max: demand.cond_max,
    cond_prio: demand.cond_prio,
    iptu_max: demand.iptu_max,
    iptu_prio: demand.iptu_prio,
    amenidades_imovel: amenidades?.filter((a: any) => !a.amenity.startsWith('[cond]')).map((a: any) => ({ amenity: a.amenity, priority: a.priority })) ?? [],
    amenidades_cond: amenidades?.filter((a: any) => a.amenity.startsWith('[cond]')).map((a: any) => ({ amenity: a.amenity, priority: a.priority })) ?? [],
  }
}

// Salva uma propriedade scrapeada e retorna o ID
async function upsertProperty(supabase: ReturnType<typeof getSupabaseAdmin>, prop: ScrapedProperty): Promise<string | null> {
  const { data, error } = await supabase
    .from('scraped_properties')
    .upsert({
      portal: prop.portal,
      portal_id: prop.portal_id,
      url: prop.url,
      title: prop.title,
      tipo_imovel: prop.tipo_imovel,
      estado: prop.estado,
      cidade: prop.cidade,
      bairro: prop.bairro,
      endereco: prop.endereco,
      area_util: prop.area_util,
      area_total: prop.area_total,
      quartos: prop.quartos,
      suites: prop.suites,
      banheiros: prop.banheiros,
      vagas: prop.vagas,
      valor: prop.valor,
      cond_valor: prop.cond_valor,
      iptu_valor: prop.iptu_valor,
      finalidade: prop.finalidade,
      amenidades: prop.amenidades,
      descricao: prop.descricao,
      imagens: prop.imagens,
      raw_data: prop.raw_data,
      scraped_at: new Date().toISOString(),
    }, { onConflict: 'portal,portal_id', ignoreDuplicates: false })
    .select('id')
    .single()

  if (error) { console.warn('upsertProperty error:', error.message); return null }
  return data?.id ?? null
}

// Executa o job completo para uma demanda
export async function runMatchJob(demandId: string): Promise<{ total: number; portals: string[] }> {
  const supabase = getSupabaseAdmin()

  // Marca job como running
  const { data: job } = await supabase
    .from('match_jobs')
    .insert({ demand_id: demandId, status: 'running', started_at: new Date().toISOString(), portals: [] })
    .select('id').single()

  try {
    const demand = await loadDemandForMatch(demandId)
    if (!demand) throw new Error('Demanda não encontrada')

    // Roda todos os scrapers em paralelo
    const [zapProps, iwProps, pilarProps, jardinsProps, axpeProps] = await Promise.allSettled([
      scrapeZap(demand),
      scrapeImovelWeb(demand),
      scrapePilar(demand),
      scrapeJardins(demand),
      scrapeAxpe(demand),
    ])

    const allProperties: ScrapedProperty[] = [
      ...(zapProps.status === 'fulfilled' ? zapProps.value : []),
      ...(iwProps.status === 'fulfilled' ? iwProps.value : []),
      ...(pilarProps.status === 'fulfilled' ? pilarProps.value : []),
      ...(jardinsProps.status === 'fulfilled' ? jardinsProps.value : []),
      ...(axpeProps.status === 'fulfilled' ? axpeProps.value : []),
    ]

    // Salva propriedades e calcula scores
    let matched = 0
    for (const prop of allProperties) {
      const propId = await upsertProperty(supabase, prop)
      if (!propId) continue

      const score = calcScore(demand, prop)

      // Só salva se score >= 30 (filtra resultados muito ruins)
      if (score.total < 30) continue

      await supabase
        .from('demand_matches')
        .upsert({
          demand_id: demandId,
          property_id: propId,
          score: score.total,
          score_details: score,
          matched_at: new Date().toISOString(),
        }, { onConflict: 'demand_id,property_id', ignoreDuplicates: false })

      matched++
    }

    const portals = ['zap', 'imovelweb', 'pilar', 'jardins', 'axpe']

    // Atualiza job como concluído
    if (job?.id) {
      await supabase.from('match_jobs').update({
        status: 'done',
        total_found: matched,
        portals,
        finished_at: new Date().toISOString(),
      }).eq('id', job.id)
    }

    return { total: matched, portals }
  } catch (err: any) {
    if (job?.id) {
      await supabase.from('match_jobs').update({
        status: 'error',
        error: err.message,
        finished_at: new Date().toISOString(),
      }).eq('id', job.id)
    }
    throw err
  }
}
