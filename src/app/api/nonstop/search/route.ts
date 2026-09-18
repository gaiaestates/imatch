import { NextRequest, NextResponse } from 'next/server'

const BASE = 'https://www.usenonstop.com/api/unstable'

// Retorna a base do subscriber, ex: https://www.usenonstop.com/imoveis/gaiaestates
async function fetchSubscriberBase(token: string): Promise<string | null> {
  try {
    const res = await fetch(`${BASE}/site/urls`, {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 3600 },
    })
    if (!res.ok) return null
    const urls: string[] = await res.json()
    const first = urls.find(u => u.includes('/imoveis/'))
    if (!first) return null
    // first é algo como https://domain.com/imoveis/gaiaestates/slug-do-imovel
    const afterImoveis = first.split('/imoveis/')[1] ?? ''
    const subscriberSlug = afterImoveis.split('/')[0]
    if (!subscriberSlug) return null
    const domain = first.split('/imoveis/')[0]
    return `${domain}/imoveis/${subscriberSlug}`
  } catch {
    return null
  }
}

const TIPO_MAP: Record<string, string[]> = {
  'Apartamento':        ['APARTAMENTO_TIPO', 'APARTAMENTO_GARDEN', 'FLAT', 'STUDIO', 'KITNET', 'LOFT', 'DUPLEX', 'TRIPLEX'],
  'Casa':               ['CASA_TIPO', 'SOBRADO', 'CASA_DE_VILA'],
  'Casa em Condomínio': ['CASA_EM_CONDOMINIO'],
  'Cobertura':          ['COBERTURA', 'DUPLEX', 'TRIPLEX'],
  'Terreno Residencial':['TERRENO_RESIDENCIAL'],
  'Terreno Comercial':  ['TERRENO_COMERCIAL'],
  'Comercial':          ['CONJUNTO_COMERCIAL', 'LOJA_DE_RUA', 'GALPAO', 'LAGE_CORPORATIVA', 'EDIFICIO_MONOUSUARIO'],
}

async function fetchTodos(availableFor: 'VENDA' | 'LOCACAO', extra: Record<string, string>) {
  const token = process.env.NONSTOP_API_TOKEN
  if (!token) return []

  const qs = new URLSearchParams({
    availableFor,
    perPage: '20',
    currentPage: '1',
    sortBy: '_id',
    sortOrder: '1',
    ...extra,
  })

  const res = await fetch(`${BASE}/imoveis/todos?${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 300 },
  })
  if (!res.ok) return []
  const data = await res.json()
  return (data.properties ?? []) as any[]
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const finalidade  = sp.get('finalidade')  ?? 'compra'
  const tipo_imovel = sp.get('tipo_imovel') ?? ''
  const cidade      = sp.get('cidade')      ?? ''
  const estado      = sp.get('estado')      ?? ''
  const areas       = sp.get('areas')       ?? ''   // bairros, comma-sep
  const quartos_min        = sp.get('quartos_min')
  const vagas_min          = sp.get('vagas_min')
  const valor_min          = sp.get('valor_min')
  const valor_max          = sp.get('valor_max')
  const aluguel_valor_min  = sp.get('aluguel_valor_min')
  const aluguel_valor_max  = sp.get('aluguel_valor_max')
  const area_min           = sp.get('area_min')
  const cond_max           = sp.get('cond_max')

  const baseExtra: Record<string, string> = {}
  if (cidade)      baseExtra.city          = cidade
  if (estado)      baseExtra.state         = estado
  if (areas)       baseExtra.areas         = areas
  if (quartos_min) baseExtra.minRooms       = quartos_min
  if (vagas_min)   baseExtra.minParkingLots = vagas_min
  if (area_min)    baseExtra.minPrivate     = area_min
  if (cond_max)    baseExtra.maxCondo       = cond_max

  // For venda: use valor_min/valor_max; for locacao: use aluguel_valor_* if set, else valor_*
  const extraVenda: Record<string, string> = { ...baseExtra }
  if (valor_min) extraVenda.minVal = valor_min
  if (valor_max) extraVenda.maxVal = valor_max

  const extraLocacao: Record<string, string> = { ...baseExtra }
  const locMin = aluguel_valor_min ?? valor_min
  const locMax = aluguel_valor_max ?? valor_max
  if (locMin) extraLocacao.minVal = locMin
  if (locMax) extraLocacao.maxVal = locMax

  const extra = extraVenda // default for non-ambos paths

  const tipos = TIPO_MAP[tipo_imovel]
  if (tipos) extra.type = tipos.join(',')

  const token = process.env.NONSTOP_API_TOKEN!

  let properties: any[]

  if (finalidade === 'ambos') {
    const [venda, locacao] = await Promise.all([
      fetchTodos('VENDA', extraVenda),
      fetchTodos('LOCACAO', extraLocacao),
    ])
    const seen = new Set<string>()
    properties = []
    for (const p of [...venda, ...locacao]) {
      if (!seen.has(p.id)) { seen.add(p.id); properties.push(p) }
    }
  } else {
    properties = await fetchTodos(finalidade === 'compra' ? 'VENDA' : 'LOCACAO', extra)
  }

  // Base do subscriber: vem da API ou do env como fallback
  // Ex: https://www.usenonstop.com/imoveis/gaiaestates
  const subscriberSlugEnv = process.env.NONSTOP_SUBSCRIBER_SLUG
  const subscriberBase =
    (await fetchSubscriberBase(token)) ??
    (subscriberSlugEnv ? `https://www.usenonstop.com/imoveis/${subscriberSlugEnv}` : null)

  // URL correta: {subscriberBase}/{p.id}  ex: .../imoveis/gaiaestates/UYAH1
  const propertiesWithUrls = properties.slice(0, 20).map((p: any) => ({
    ...p,
    fullUrl: subscriberBase && p.id ? `${subscriberBase}/${p.id}` : null,
  }))

  return NextResponse.json({ properties: propertiesWithUrls })
}
