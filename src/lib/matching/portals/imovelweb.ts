// ================================================================
// Scraper — ImovelWeb
// ================================================================

import type { DemandForMatch, ScrapedProperty } from '../types'

export function buildImovelWebSiteUrl(demand: DemandForMatch): string {
  const business = demand.finalidade === 'compra' ? 'venda' : 'aluguel'
  const tipoSlug: Record<string, string> = {
    'Apartamento': 'apartamentos',
    'Casa': 'casas',
    'Casa em Condomínio': 'casas',
    'Cobertura': 'coberturas',
    'Studio': 'studios',
    'Kitnet': 'kitnets',
    'Sala Comercial': 'salas-comerciais',
    'Galpão': 'galpoes-depositos',
    'Terreno Residencial': 'terrenos',
  }
  const tipo = tipoSlug[demand.tipo_imovel] ?? 'imoveis'
  const cidade = (demand.cidade ?? 'sao-paulo')
    .toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '-')

  const params: string[] = []
  if (demand.quartos_min) params.push(`dormitorios-${demand.quartos_min}`)
  if (demand.vagas_min)   params.push(`cocheras-${demand.vagas_min}`)

  const queryParams = new URLSearchParams()
  if (demand.valor_min) queryParams.set('precio-desde', String(demand.valor_min))
  if (demand.valor_max) queryParams.set('precio-hasta', String(demand.valor_max))
  if (demand.area_min)  queryParams.set('superficie-desde', String(demand.area_min))
  if (demand.area_max)  queryParams.set('superficie-hasta', String(demand.area_max))

  const path = [tipo, business, cidade, ...params].join('-')
  const qs = queryParams.toString()
  return `https://www.imovelweb.com.br/${path}.html${qs ? '?' + qs : ''}`
}

function parseAmenidadesImovelWeb(text: string): string[] {
  const amenidades: string[] = []
  const kws = [
    ['piscina', 'Piscina'], ['academia', 'Academia'], ['churrasqueira', 'Churrasqueira'],
    ['portaria', 'Portaria 24h'], ['elevador', 'Elevador'], ['playground', 'Playground'],
    ['salao de festas', 'Salão de festas'], ['quadra', 'Quadra'], ['sauna', 'Sauna'],
    ['sacada', 'Sacada/Varanda'], ['varanda', 'Varanda'], ['jardim', 'Jardim'],
    ['quintal', 'Quintal'], ['closet', 'Closet'], ['pet', 'Pet friendly'],
    ['gourmet', 'Cozinha gourmet'], ['gerador', 'Gerador'],
  ]
  const lower = text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  for (const [kw, label] of kws) {
    if (lower.includes(kw)) amenidades.push(label)
  }
  return amenidades
}

export async function scrapeImovelWeb(demand: DemandForMatch): Promise<ScrapedProperty[]> {
  // ImovelWeb usa renderização server-side — buscamos o HTML e extraímos dados estruturados (JSON-LD)
  const url = buildImovelWebSiteUrl(demand)

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'pt-BR,pt;q=0.9',
      },
      signal: AbortSignal.timeout(15000),
    })

    if (!res.ok) return []
    const html = await res.text()

    // Extrai JSON-LD de listagem
    const jsonLdMatches = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    const properties: ScrapedProperty[] = []

    for (const match of jsonLdMatches.slice(0, 25)) {
      try {
        const json = JSON.parse(match[1])
        if (!json['@type'] || !['Residence', 'Apartment', 'SingleFamilyResidence', 'House'].includes(json['@type'])) continue

        const price = json.offers?.price ?? json.price
        const descricao = json.description ?? ''

        properties.push({
          portal: 'imovelweb',
          portal_id: json.identifier?.value ?? String(Math.random()),
          url: json.url ?? url,
          title: json.name,
          tipo_imovel: json['@type'],
          cidade: json.address?.addressLocality,
          estado: json.address?.addressRegion,
          bairro: json.address?.addressLocality,
          area_util: json.floorSize?.value,
          quartos: json.numberOfRooms,
          banheiros: json.numberOfBathroomsTotal,
          valor: price ? Number(price) : undefined,
          finalidade: demand.finalidade,
          amenidades: parseAmenidadesImovelWeb(descricao),
          descricao,
          raw_data: json,
        })
      } catch { /* skip invalid JSON */ }
    }

    return properties.slice(0, 20)
  } catch (err) {
    console.warn('[ImovelWeb] scrape error:', err)
    return []
  }
}
