// ================================================================
// Scrapers — Portais boutique: Pilar, Jardins & Co, Axpe
// Estratégia: HTML scraping com extração de dados estruturados
// ================================================================

import type { DemandForMatch, ScrapedProperty } from '../types'

function amenidadesFromText(text: string): string[] {
  const lower = text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  const results: string[] = []
  const kws: [string, string][] = [
    ['piscina', 'Piscina'], ['academia', 'Academia'], ['churrasqueira', 'Churrasqueira'],
    ['portaria', 'Portaria 24h'], ['elevador', 'Elevador'], ['playground', 'Playground'],
    ['salao de festas', 'Salão de festas'], ['quadra', 'Quadra'], ['sauna', 'Sauna'],
    ['sacada', 'Sacada/Varanda'], ['varanda', 'Varanda'], ['jardim', 'Jardim'],
    ['quintal', 'Quintal'], ['closet', 'Closet'], ['pet', 'Pet friendly'],
    ['gourmet', 'Cozinha gourmet'], ['gerador', 'Gerador'], ['coworking', 'Coworking'],
    ['quadra de tenis', 'Quadra de tênis'], ['quadra esportiva', 'Quadra esportiva'],
    ['bicicletario', 'Bicicletário'], ['salao gourmet', 'Salão gourmet'],
  ]
  for (const [kw, label] of kws) {
    if (lower.includes(kw)) results.push(label)
  }
  return [...new Set(results)]
}

async function scrapeGenericHtml(
  portal: 'pilar' | 'jardins' | 'axpe',
  searchUrl: string,
  demand: DemandForMatch,
): Promise<ScrapedProperty[]> {
  try {
    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'pt-BR,pt;q=0.9',
      },
      signal: AbortSignal.timeout(20000),
    })

    if (!res.ok) return []
    const html = await res.text()

    // Tenta extrair JSON-LD primeiro
    const jsonLdMatches = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    const properties: ScrapedProperty[] = []

    for (const match of jsonLdMatches.slice(0, 20)) {
      try {
        const json = JSON.parse(match[1])
        if (!json.offers && !json.price && !json['@type']) continue

        const items = Array.isArray(json) ? json : json['@graph'] ? json['@graph'] : [json]
        for (const item of items) {
          if (!['Residence', 'Apartment', 'House', 'SingleFamilyResidence', 'RealEstateListing'].includes(item['@type'] ?? '')) continue
          const descricao = item.description ?? ''
          properties.push({
            portal,
            portal_id: item.identifier?.value ?? item['@id'] ?? String(Date.now() + Math.random()),
            url: item.url ?? searchUrl,
            title: item.name,
            tipo_imovel: demand.tipo_imovel,
            cidade: item.address?.addressLocality ?? demand.cidade,
            estado: item.address?.addressRegion ?? demand.estado,
            bairro: item.address?.addressLocality,
            area_util: item.floorSize?.value,
            quartos: item.numberOfRooms,
            banheiros: item.numberOfBathroomsTotal,
            valor: item.offers?.price ?? item.price ? Number(item.offers?.price ?? item.price) : undefined,
            finalidade: demand.finalidade,
            amenidades: amenidadesFromText(descricao),
            descricao,
            raw_data: item,
          })
        }
      } catch { /* skip */ }
    }

    if (properties.length > 0) return properties.slice(0, 15)

    // Fallback: retorna um registro representando a busca (link direto)
    return [{
      portal,
      portal_id: `search-${Date.now()}`,
      url: searchUrl,
      title: `Busca em ${portal} — ${demand.tipo_imovel} em ${demand.cidade}`,
      tipo_imovel: demand.tipo_imovel,
      cidade: demand.cidade,
      estado: demand.estado,
      finalidade: demand.finalidade,
      amenidades: [],
    }]
  } catch (err) {
    console.warn(`[${portal}] scrape error:`, err)
    return []
  }
}

// ---- PILAR IMÓVEIS ----
export function buildPilarUrl(demand: DemandForMatch): string {
  const base = 'https://www.pilarimoveis.com.br'
  const business = demand.finalidade === 'compra' ? 'comprar' : 'alugar'
  const params = new URLSearchParams()
  if (demand.cidade)     params.set('cidade', demand.cidade)
  if (demand.quartos_min) params.set('quartos', String(demand.quartos_min))
  if (demand.valor_max)  params.set('valor_max', String(demand.valor_max))
  return `${base}/${business}?${params.toString()}`
}

export async function scrapePilar(demand: DemandForMatch): Promise<ScrapedProperty[]> {
  return scrapeGenericHtml('pilar', buildPilarUrl(demand), demand)
}

// ---- JARDINS & CO ----
export function buildJardinsUrl(demand: DemandForMatch): string {
  const base = 'https://www.jardinscoimoveis.com.br'
  const business = demand.finalidade === 'compra' ? 'venda' : 'locacao'
  const params = new URLSearchParams()
  if (demand.cidade)     params.set('cidade', demand.cidade)
  if (demand.quartos_min) params.set('dormitorios', String(demand.quartos_min))
  if (demand.valor_max)  params.set('preco_ate', String(demand.valor_max))
  return `${base}/imoveis/${business}?${params.toString()}`
}

export async function scrapeJardins(demand: DemandForMatch): Promise<ScrapedProperty[]> {
  return scrapeGenericHtml('jardins', buildJardinsUrl(demand), demand)
}

// ---- AXPE IMÓVEIS ----
export function buildAxpeUrl(demand: DemandForMatch): string {
  const base = 'https://www.axpe.com.br'
  const business = demand.finalidade === 'compra' ? 'venda' : 'locacao'
  const tipoSlug: Record<string, string> = {
    'Apartamento': 'apartamento',
    'Casa': 'casa',
    'Casa em Condomínio': 'casa-condominio',
    'Cobertura': 'cobertura',
    'Studio': 'studio',
  }
  const tipo = tipoSlug[demand.tipo_imovel] ?? 'imovel'
  const cidade = (demand.cidade ?? 'sao-paulo')
    .toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '-')
  const params = new URLSearchParams()
  if (demand.quartos_min) params.set('quartos', String(demand.quartos_min))
  if (demand.valor_max)   params.set('preco_maximo', String(demand.valor_max))
  const qs = params.toString()
  return `${base}/${business}/${tipo}/${cidade}${qs ? '?' + qs : ''}`
}

export async function scrapeAxpe(demand: DemandForMatch): Promise<ScrapedProperty[]> {
  return scrapeGenericHtml('axpe', buildAxpeUrl(demand), demand)
}
