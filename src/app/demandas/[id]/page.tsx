import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import LogoutButton from '@/components/LogoutButton'
import MatchTrigger from '@/components/MatchTrigger'
import MatchCard from '@/components/MatchCard'
import { getPortalSearchUrls, loadDemandForMatch } from '@/lib/matching/runner'

const PORTAL_LABELS: Record<string, { name: string; color: string }> = {
  zap:       { name: 'ZAP Imóveis',   color: 'bg-red-100 text-red-700' },
  imovelweb: { name: 'ImovelWeb',     color: 'bg-blue-100 text-blue-700' },
  pilar:     { name: 'Pilar',         color: 'bg-purple-100 text-purple-700' },
  jardins:   { name: 'Jardins & Co',  color: 'bg-amber-100 text-amber-700' },
  axpe:      { name: 'Axpe',          color: 'bg-emerald-100 text-emerald-700' },
}

export default async function DemandaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: demand } = await supabase
    .from('demands')
    .select('*, profiles(full_name)')
    .eq('id', id)
    .single()

  if (!demand) redirect('/demandas')

  const { data: locations } = await supabase
    .from('demand_locations')
    .select('type, value')
    .eq('demand_id', id)

  const { data: amenidades } = await supabase
    .from('demand_amenities')
    .select('amenity, priority')
    .eq('demand_id', id)

  const { data: matches } = await supabase
    .from('demand_matches')
    .select(`
      id, score, score_details, status, matched_at,
      scraped_properties(portal, url, title, tipo_imovel, cidade, bairro,
        area_util, quartos, suites, vagas, valor, cond_valor, amenidades, imagens)
    `)
    .eq('demand_id', id)
    .order('score', { ascending: false })
    .limit(50)

  const { data: lastJob } = await supabase
    .from('match_jobs')
    .select('status, finished_at, total_found')
    .eq('demand_id', id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  // Gera URLs de busca para cada portal
  const demandForMatch = await loadDemandForMatch(id)
  const portalUrls = demandForMatch ? getPortalSearchUrls(demandForMatch) : {}

  const isOwner = demand.broker_id === user.id
  const bairros = locations?.filter((l: any) => l.type === 'bairro').map((l: any) => l.value) ?? []
  const amenImovel = amenidades?.filter((a: any) => !a.amenity.startsWith('[cond]')) ?? []
  const amenCond = amenidades?.filter((a: any) => a.amenity.startsWith('[cond]')) ?? []

  function formatBRL(v: number) {
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 })
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="bg-white border-b border-stone-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/demandas" className="text-xl font-serif font-medium text-emerald-800">
            i<em className="font-light text-stone-400 not-italic">Match</em>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/demandas" className="text-sm text-stone-500 hover:text-stone-800">← Demandas</Link>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">

        {/* Cabeçalho da demanda */}
        <div className="bg-white rounded-xl border border-stone-200 p-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  demand.finalidade === 'compra' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                }`}>
                  {demand.finalidade === 'compra' ? 'Compra' : 'Aluguel'}
                </span>
                <span className="text-xs text-stone-400">
                  {new Date(demand.created_at).toLocaleDateString('pt-BR')}
                </span>
              </div>
              <h1 className="text-xl font-medium text-stone-800">{demand.tipo_imovel}</h1>
              {demand.cidade && (
                <p className="text-stone-500 text-sm mt-0.5">
                  📍 {demand.cidade}{demand.estado ? `, ${demand.estado}` : ''}
                  {bairros.length > 0 && ` — ${bairros.join(', ')}`}
                </p>
              )}
            </div>
            {isOwner && (
              <MatchTrigger demandId={id} lastJob={lastJob} />
            )}
          </div>

          {/* Critérios */}
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {demand.quartos_min && (
              <Stat label="Quartos mín." value={`${demand.quartos_min}+`} prio={demand.quartos_prio} />
            )}
            {demand.suites_min && (
              <Stat label="Suítes mín." value={`${demand.suites_min}+`} prio={demand.suites_prio} />
            )}
            {demand.banheiros_min && (
              <Stat label="Banheiros mín." value={`${demand.banheiros_min}+`} prio={demand.banheiros_prio} />
            )}
            {demand.vagas_min && (
              <Stat label="Vagas mín." value={`${demand.vagas_min}+`} prio={demand.vagas_prio} />
            )}
            {(demand.area_min || demand.area_max) && (
              <Stat label="Área (m²)" value={`${demand.area_min ?? '—'} – ${demand.area_max ?? '—'}`} prio={demand.area_min_prio} />
            )}
            {(demand.valor_min || demand.valor_max) && (
              <Stat label="Valor" value={`${demand.valor_min ? formatBRL(demand.valor_min) : '—'} – ${demand.valor_max ? formatBRL(demand.valor_max) : '—'}`} prio={demand.valor_max_prio} />
            )}
            {demand.cond_max && (
              <Stat label="Cond. máx." value={formatBRL(demand.cond_max)} prio={demand.cond_prio} />
            )}
            {demand.iptu_max && (
              <Stat label="IPTU máx./mês" value={formatBRL(demand.iptu_max)} prio={demand.iptu_prio} />
            )}
          </div>

          {/* Amenidades */}
          {amenImovel.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-stone-400 font-medium uppercase tracking-wider mb-1.5">Do imóvel</p>
              <div className="flex flex-wrap gap-1.5">
                {amenImovel.map((a: any) => (
                  <AmenTag key={a.amenity} label={a.amenity} priority={a.priority} />
                ))}
              </div>
            </div>
          )}
          {amenCond.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-stone-400 font-medium uppercase tracking-wider mb-1.5">Do condomínio</p>
              <div className="flex flex-wrap gap-1.5">
                {amenCond.map((a: any) => (
                  <AmenTag key={a.amenity} label={a.amenity.replace('[cond] ', '')} priority={a.priority} />
                ))}
              </div>
            </div>
          )}

          {demand.observacoes && (
            <p className="mt-3 text-sm text-stone-500 border-t border-stone-100 pt-3">{demand.observacoes}</p>
          )}
        </div>

        {/* Links de busca por portal */}
        <div className="bg-white rounded-xl border border-stone-200 p-4">
          <h2 className="text-sm font-semibold text-stone-700 mb-3">Buscar nos portais</h2>
          <div className="flex flex-wrap gap-2">
            {Object.entries(portalUrls).map(([portal, url]) => {
              const meta = PORTAL_LABELS[portal] ?? { name: portal, color: 'bg-stone-100 text-stone-600' }
              return (
                <a key={portal} href={url} target="_blank" rel="noopener noreferrer"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${meta.color} hover:opacity-80 transition-opacity`}>
                  {meta.name} ↗
                </a>
              )
            })}
          </div>
          <p className="text-xs text-stone-400 mt-2">Clique para abrir a busca filtrada em cada portal</p>
        </div>

        {/* Matches */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-medium text-stone-800">
              Matches automáticos
              {matches && matches.length > 0 && (
                <span className="ml-2 text-sm font-normal text-stone-500">{matches.length} encontrado{matches.length !== 1 ? 's' : ''}</span>
              )}
            </h2>
            {lastJob && (
              <span className="text-xs text-stone-400">
                Última atualização: {lastJob.finished_at ? new Date(lastJob.finished_at).toLocaleDateString('pt-BR') : '—'}
              </span>
            )}
          </div>

          {!matches || matches.length === 0 ? (
            <div className="bg-white rounded-xl border border-stone-200 p-8 text-center">
              <p className="text-stone-400 text-sm mb-1">Nenhum match encontrado ainda.</p>
              <p className="text-stone-400 text-xs">
                {isOwner ? 'Clique em "Buscar matches" para iniciar a varredura nos portais.' : 'Aguarde o proprietário executar a busca.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {matches.map((m: any) => (
                <MatchCard key={m.id} match={m} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

// Componentes auxiliares
function Stat({ label, value, prio }: { label: string; value: string; prio?: string | null }) {
  return (
    <div className="bg-stone-50 rounded-lg p-2.5">
      <p className="text-xs text-stone-400">{label}</p>
      <p className="text-sm font-medium text-stone-800 mt-0.5">{value}</p>
      {prio && (
        <span className={`text-xs mt-1 inline-block px-1.5 py-0.5 rounded ${
          prio === 'req' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-600'
        }`}>
          {prio === 'req' ? 'Obrigatório' : 'Preferencial'}
        </span>
      )}
    </div>
  )
}

function AmenTag({ label, priority }: { label: string; priority: string }) {
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${
      priority === 'req'
        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
        : 'bg-amber-50 text-amber-700 border-amber-300'
    }`}>
      {priority === 'req' ? '✓ ' : '★ '}{label}
    </span>
  )
}
