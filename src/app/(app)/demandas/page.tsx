import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import DemandaFilters from '@/components/DemandaFilters'
import SaveButton from '@/components/SaveButton'

function formatBRL(v: number) {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(v % 1_000_000 === 0 ? 0 : 1)}M`
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`
  return `R$ ${v}`
}

function periodoToDate(periodo: string): Date | null {
  const now = new Date()
  switch (periodo) {
    case 'mes': return new Date(now.getFullYear(), now.getMonth(), 1)
    case 'mes-passado': return new Date(now.getFullYear(), now.getMonth() - 1, 1)
    case '3meses': return new Date(now.setMonth(now.getMonth() - 3))
    case '6meses': return new Date(now.setMonth(now.getMonth() - 6))
    case 'ano': return new Date(now.getFullYear(), 0, 1)
    default: return null
  }
}

function diasDesde(dateStr: string) {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000)
}

interface SearchParams {
  finalidade?: string; tipo?: string; quartos?: string; bairro?: string
  cidade?: string; valor_max?: string; area_min?: string; vpm2_max?: string
  cond_max?: string; vagas?: string; ordem?: string; periodo?: string
  salvas?: string; minhas?: string
}

export default async function DemandasPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const filters = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: savedRows } = await supabase
    .from('saved_demands').select('demand_id').eq('broker_id', user.id)
  const savedSet = new Set(savedRows?.map((r: any) => r.demand_id) ?? [])

  let query = supabase
    .from('demands')
    .select('id, broker_id, finalidade, tipo_imovel, cidade, estado, area_min, area_max, quartos_min, vagas_min, valor_min, valor_max, cond_max, status, created_at, profiles(full_name, avatar_url, imobiliaria, autonomo)')
    .eq('status', 'ativa')

  if (filters.finalidade) query = query.eq('finalidade', filters.finalidade)
  if (filters.tipo)       query = query.eq('tipo_imovel', filters.tipo)
  if (filters.quartos)    query = query.gte('quartos_min', Number(filters.quartos))
  if (filters.vagas)      query = query.gte('vagas_min', Number(filters.vagas))
  if (filters.valor_max)  query = query.lte('valor_max', Number(filters.valor_max))
  if (filters.area_min)   query = query.gte('area_min', Number(filters.area_min))
  if (filters.cond_max)   query = query.lte('cond_max', Number(filters.cond_max))
  if (filters.cidade)     query = query.ilike('cidade', `%${filters.cidade}%`)
  if (filters.minhas)     query = query.eq('broker_id', user.id)

  const periodoDate = periodoToDate(filters.periodo ?? '')
  if (periodoDate) query = query.gte('created_at', periodoDate.toISOString())
  if (filters.periodo === 'mes-passado') {
    const now = new Date()
    query = query.lt('created_at', new Date(now.getFullYear(), now.getMonth(), 1).toISOString())
  }

  switch (filters.ordem) {
    case 'antigo':     query = query.order('created_at', { ascending: true }); break
    case 'valor-asc':  query = query.order('valor_max', { ascending: true, nullsFirst: false }); break
    case 'valor-desc': query = query.order('valor_max', { ascending: false, nullsFirst: false }); break
    default:           query = query.order('created_at', { ascending: false }); break
  }

  query = query.limit(200)
  const { data: rawDemands } = await query

  const demandIds = rawDemands?.map((d: any) => d.id) ?? []
  const { data: allLocations } = demandIds.length > 0
    ? await supabase.from('demand_locations').select('demand_id, value').in('demand_id', demandIds).eq('type', 'bairro')
    : { data: [] }

  const bairrosByDemand: Record<string, string[]> = {}
  allLocations?.forEach((loc: any) => {
    if (!bairrosByDemand[loc.demand_id]) bairrosByDemand[loc.demand_id] = []
    bairrosByDemand[loc.demand_id].push(loc.value)
  })

  let demands = rawDemands ?? []
  if (filters.salvas) demands = demands.filter((d: any) => savedSet.has(d.id))
  if (filters.bairro) {
    const q = filters.bairro.toLowerCase()
    demands = demands.filter((d: any) => bairrosByDemand[d.id]?.some((b: string) => b.toLowerCase().includes(q)))
  }
  if (filters.vpm2_max && Number(filters.vpm2_max) > 0) {
    const maxVpm2 = Number(filters.vpm2_max)
    demands = demands.filter((d: any) => {
      if (!d.valor_max || !d.area_min) return true
      return (d.valor_max / d.area_min) <= maxVpm2
    })
  }

  const pageTitle = filters.minhas ? 'Minhas demandas'
    : filters.salvas ? 'Meus favoritos'
    : 'Demandas'

  const isMinhas = !!filters.minhas

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold text-stone-700">{pageTitle}</h1>
      </div>

      <Suspense>
        <DemandaFilters total={demands.length} />
      </Suspense>

      {demands.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-stone-400 text-lg mb-2">Nenhuma demanda encontrada.</p>
          <p className="text-stone-400 text-sm mb-6">Ajuste os filtros ou cadastre uma nova.</p>
          <Link href="/nova-demanda"
            className="bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors">
            Cadastrar demanda
          </Link>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {demands.map((d: any) => {
            const bairros = bairrosByDemand[d.id] ?? []
            const vpm2 = d.valor_max && d.area_min ? Math.round(d.valor_max / d.area_min) : null
            const isSaved = savedSet.has(d.id)
            const dt = new Date(d.created_at)
            const dataFormatada = dt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
            const dias = diasDesde(d.created_at)
            const alerta30 = isMinhas && dias >= 30
            const profile = d.profiles as any
            const imobLabel = profile?.autonomo ? 'Autônomo' : (profile?.imobiliaria || '')

            return (
              <Link key={d.id} href={`/demandas/${d.id}`}
                className={`bg-white rounded-xl border p-4 hover:shadow-md hover:border-stone-300 transition-all block group ${
                  alerta30 ? 'border-amber-300' : 'border-stone-200'
                }`}>

                {alerta30 && (
                  <div className="flex items-center gap-1.5 bg-amber-50 text-amber-700 text-xs font-medium px-2.5 py-1.5 rounded-lg mb-2 border border-amber-200">
                    ⚠️ Demanda com {dias} dias — ainda ativa?
                  </div>
                )}

                <div className="flex items-start justify-between mb-2 gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      d.finalidade === 'compra' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {d.finalidade === 'compra' ? 'Compra' : 'Aluguel'}
                    </span>
                    <span className="text-xs text-stone-300">{dataFormatada}</span>
                  </div>
                  <SaveButton demandId={d.id} isSaved={isSaved} />
                </div>

                <h3 className="font-semibold text-stone-800 group-hover:text-emerald-800 transition-colors">
                  {d.tipo_imovel}
                </h3>

                {(d.cidade || bairros.length > 0) && (
                  <p className="text-xs text-stone-500 mt-0.5">
                    📍 {[d.cidade, ...bairros.slice(0, 2)].filter(Boolean).join(' · ')}
                    {bairros.length > 2 && ` +${bairros.length - 2}`}
                  </p>
                )}

                <div className="flex flex-wrap gap-1.5 mt-2">
                  {d.quartos_min && (
                    <span className="bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full text-xs">{d.quartos_min}+ qtos</span>
                  )}
                  {d.vagas_min && (
                    <span className="bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full text-xs">{d.vagas_min}+ vagas</span>
                  )}
                  {(d.area_min || d.area_max) && (
                    <span className="bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full text-xs">
                      {d.area_min ?? '?'}{d.area_max ? `–${d.area_max}` : '+'} m²
                    </span>
                  )}
                </div>

                <div className="mt-3 pt-2.5 border-t border-stone-100 flex items-end justify-between">
                  <div>
                    {d.valor_max ? (
                      <>
                        <p className="text-xs text-stone-400">Valor máx.</p>
                        <p className="text-sm font-bold text-stone-800">{formatBRL(d.valor_max)}</p>
                      </>
                    ) : (
                      <p className="text-xs text-stone-300">Valor a combinar</p>
                    )}
                  </div>
                  {vpm2 && (
                    <div className="text-right">
                      <p className="text-xs text-stone-400">R$/m²</p>
                      <p className="text-xs font-medium text-stone-500">{vpm2.toLocaleString('pt-BR')}</p>
                    </div>
                  )}
                </div>

                {/* Corretor: avatar + nome + imobiliária */}
                {profile && (
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden border border-stone-100">
                        {profile.avatar_url
                          ? <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
                          : profile.full_name?.charAt(0).toUpperCase()
                        }
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs text-stone-500 truncate block">{profile.full_name}</span>
                        {imobLabel && (
                          <span className="text-xs text-stone-400 truncate block">{imobLabel}</span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-emerald-700 font-medium group-hover:underline ml-auto shrink-0">
                      Ver →
                    </span>
                  </div>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
