import { NextRequest, NextResponse } from 'next/server'

const BASE = 'https://www.usenonstop.com/api/unstable'

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
  const quartos_min = sp.get('quartos_min')
  const vagas_min   = sp.get('vagas_min')
  const valor_max   = sp.get('valor_max')
  const area_min    = sp.get('area_min')
  const cond_max    = sp.get('cond_max')

  const extra: Record<string, string> = {}
  if (cidade)      extra.city    = cidade
  if (estado)      extra.state   = estado
  if (areas)       extra.areas   = areas
  if (quartos_min) extra.minRooms       = quartos_min
  if (vagas_min)   extra.minParkingLots = vagas_min
  if (valor_max)   extra.maxVal         = valor_max
  if (area_min)    extra.minPrivate     = area_min
  if (cond_max)    extra.maxCondo       = cond_max

  const tipos = TIPO_MAP[tipo_imovel]
  if (tipos) extra.type = tipos.join(',')

  let properties: any[]

  if (finalidade === 'ambos') {
    const [venda, locacao] = await Promise.all([
      fetchTodos('VENDA', extra),
      fetchTodos('LOCACAO', extra),
    ])
    const seen = new Set<string>()
    properties = []
    for (const p of [...venda, ...locacao]) {
      if (!seen.has(p.id)) { seen.add(p.id); properties.push(p) }
    }
  } else {
    properties = await fetchTodos(finalidade === 'compra' ? 'VENDA' : 'LOCACAO', extra)
  }

  return NextResponse.json({ properties: properties.slice(0, 20) })
}
