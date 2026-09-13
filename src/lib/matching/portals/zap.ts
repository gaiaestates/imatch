// ================================================================
// Scraper — ZAP Imóveis
// Usa a API interna do ZAP (glue-api) — JSON estruturado
// ================================================================

import type { DemandForMatch, ScrapedProperty } from '../types'

const TIPO_MAP: Record<string, string> = {
  'Apartamento': 'APARTMENT',
  'Casa': 'HOME',
  'Casa em Condomínio': 'HOME_CONDOMINIUM',
  'Cobertura': 'PENTHOUSE',
  'Studio': 'STUDIO',
  'Kitnet': 'KITNET',
  'Loft': 'LOFT',
  'Flat': 'FLAT',
  'Terreno Residencial': 'RESIDENTIAL_ALLOTMENT_LAND',
  'Terreno Comercial': 'COMMERCIAL_ALLOTMENT_LAND',
  'Sala Comercial': 'COMMERCIAL_PROPERTY',
  'Galpão': 'WAREHOUSE',
}

function buildZapUrl(demand: DemandForMatch): string {
  const tipo = TIPO_MAP[demand.tipo_imovel] ?? 'APARTMENT'
  const business = demand.finalidade === 'compra' ? 'SALE' : 'RENTAL'

  // Normaliza cidade/estado para o formato ZAP
  const estado = (demand.estado ?? 'SP').toLowerCase()
  const cidade = (demand.cidade ?? 'São Paulo')
    .toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '-')

  const params = new URLSearchParams({
    unitTypes: tipo,
    business,
    address: `${estado.toUpperCase()},${demand.cidade ?? 'São Paulo'}`,
    listingType: 'USED',
    size: '24',
    from: '0',
    __zt: 'mtdo:true',
    portal: 'ZAP',
  })

  if (demand.quartos_min) params.set('minBedrooms', String(demand.quartos_min))
  if (demand.vagas_min)   params.set('minParkingSpaces', String(demand.vagas_min))
  if (demand.area_min)    params.set('minTotalArea', String(demand.area_min))
  if (demand.area_max)    params.set('maxTotalArea', String(demand.area_max))
  if (demand.valor_min)   params.set('minPrice', String(demand.valor_min))
  if (demand.valor_max)   params.set('maxPrice', String(demand.valor_max))

  return `https://glue-api.zapimoveis.com.br/v2/listings?${params.toString()}`
}

// URL legível para o corretor (link para o site do ZAP)
export function buildZapSiteUrl(demand: DemandForMatch): string {
  const business = demand.finalidade === 'compra' ? 'comprar' : 'alugar'
  const tipoSlug: Record<string, string> = {
    'Apartamento': 'apartamentos',
    'Casa': 'casas',
    'Casa em Condomínio': 'casas',
    'Cobertura': 'coberturas',
    'Studio': 'studios',
    'Kitnet': 'kitnets',
    'Sala Comercial': 'salas-comerciais',
    'Galpão': 'galpoes',
    'Terreno Residencial': 'terrenos',
  }
  const tipo = tipoSlug[demand.tipo_imovel] ?? 'imoveis'
  const estado = (demand.estado ?? 'sp').toLowerCase()
  const cidade = (demand.cidade ?? 'Sao Paulo')
    .toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '-')

  const params: string[] = []
  if (demand.quartos_min) params.push(`quartos=${demand.quartos_min}`)
  if (demand.valor_max) params.push(`preco=0-${demand.valor_max}`)

  const query = params.length ? `?${params.join('&')}` : ''
  return `https://www.zapimoveis.com.br/${business}/${tipo}/${estado}+${cidade}/${query}`
}

function parseAmenidades(listing: any): string[] {
  const amenidades: string[] = []
  const tags: string[] = [
    ...(listing.amenities ?? []),
    ...(listing.unitFloor?.amenities ?? []),
    ...(listing.building?.amenities ?? []),
    ...(listing.condominium?.amenities ?? []),
  ]
  for (const tag of tags) {
    if (typeof tag === 'string') amenidades.push(tag)
    else if (typeof tag === 'object' && tag.label) amenidades.push(tag.label)
  }
  // Busca no título e descrição também
  const text = `${listing.title ?? ''} ${listing.description ?? ''}`.toLowerCase()
  const keywords = [
    ['piscina', 'Piscina'], ['academia', 'Academia'], ['churrasqueira', 'Churrasqueira'],
    ['portaria 24', 'Portaria 24h'], ['elevador', 'Elevador'], ['playground', 'Playground'],
    ['salao de festas', 'Salão de festas'], ['quadra', 'Quadra'], ['sauna', 'Sauna'],
    ['sacada', 'Sacada/Varanda'], ['varanda', 'Varanda'], ['jardim', 'Jardim'],
    ['quintal', 'Quintal'], ['closet', 'Closet'], ['gourmet', 'Cozinha gourmet'],
    ['suite', 'Suíte master'], ['gerador', 'Gerador'], ['pet', 'Pet friendly'],
  ]
  for (const [kw, label] of keywords) {
    if (text.includes(kw) && !amenidades.includes(label)) amenidades.push(label)
  }
  return [...new Set(amenidades)]
}

export async function scrapeZap(demand: DemandForMatch): Promise<ScrapedProperty[]> {
  const apiUrl = buildZapUrl(demand)

  const res = await fetch(apiUrl, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'X-Domain': 'www.zapimoveis.com.br',
      'Referer': 'https://www.zapimoveis.com.br/',
      'Origin': 'https://www.zapimoveis.com.br',
    },
    signal: AbortSignal.timeout(15000),
  })

  if (!res.ok) {
    console.warn(`[ZAP] HTTP ${res.status}`)
    return []
  }

  const data = await res.json()
  const listings = data?.search?.result?.listings ?? data?.listings ?? []

  return listings.slice(0, 20).map((item: any): ScrapedProperty => {
    const l = item.listing ?? item
    const pricing = l.pricingInfos?.[0] ?? {}
    const address = l.address ?? {}

    return {
      portal: 'zap',
      portal_id: l.id ?? String(Math.random()),
      url: `https://www.zapimoveis.com.br/imovel/${l.id ?? ''}`,
      title: l.title,
      tipo_imovel: l.unitTypes?.[0] ?? l.unitType,
      estado: address.state,
      cidade: address.city,
      bairro: address.neighborhood,
      endereco: address.street,
      area_util: l.usableAreas?.[0],
      area_total: l.totalAreas?.[0],
      quartos: l.bedrooms?.[0] ?? l.bathrooms,
      suites: l.suites?.[0],
      banheiros: l.bathrooms?.[0],
      vagas: l.parkingSpaces?.[0],
      valor: pricing.price ? Number(pricing.price) : undefined,
      cond_valor: pricing.monthlyCondoFee ? Number(pricing.monthlyCondoFee) : undefined,
      iptu_valor: pricing.yearlyIptu ? Number(pricing.yearlyIptu) / 12 : undefined,
      finalidade: demand.finalidade,
      amenidades: parseAmenidades(l),
      descricao: l.description,
      imagens: (l.images ?? []).slice(0, 5).map((img: any) => img?.url ?? img),
      raw_data: l,
    }
  })
}
