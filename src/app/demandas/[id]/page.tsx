import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import LogoutButton from '@/components/LogoutButton'
import MatchTrigger from '@/components/MatchTrigger'
import MatchCard from '@/components/MatchCard'
import SaveButton from '@/components/SaveButton'
import { getPortalSearchUrls } from '@/lib/matching/runner'
import type { DemandForMatch } from '@/lib/matching/types'

const PORTAL_LABELS: Record<string, { name: string; color: string }> = {
  zap:       { name: 'ZAP Imóveis',  color: 'bg-red-50 text-red-700 border-red-200' },
  imovelweb: { name: 'ImovelWeb',    color: 'bg-blue-50 text-blue-700 border-blue-200' },
  pilar:     { name: 'Pilar',        color: 'bg-purple-50 text-purple-700 border-purple-200' },
  jardins:   { name: 'Jardins & Co', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  axpe:      { name: 'Axpe',         color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
}

function fmtBRL(v: number | null) {
  if (!v) return null
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(v % 1_000_000 === 0 ? 0 : 1)}M`
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`
  return `R$ ${v}`
}

function PrioLabel({ p }: { p: string | null }) {
  if (!p) return null
  return (
    <span className={`ml-2 text-xs px-1.5 py-0.5 rounded font-medium ${
      p === 'req' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-600'
    }`}>
      {p === 'req' ? 'Obrigatório' : 'Preferencial'}
    </span>
  )
}

function Row({ label, value, prio }: { label: string; value: string | null; prio?: string | null }) {
  if (!value) return null
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-stone-100 last:border-0">
      <span className="text-sm text-stone-500">{label}</span>
      <div className="flex items-center">
        <span className="text-sm font-medium text-stone-800">{value}</span>
        {prio && <PrioLabel p={prio} />}
      </div>
    </div>
  )
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

  const [
    { data: locations },
    { data: amenidades },
    { data: matches },
    { data: lastJob },
    { data: savedRow },
  ] = await Promise.all([
    supabase.from('demand_locations').select('type, value').eq('demand_id', id),
    supabase.from('demand_amenities').select('amenity, priority').eq('demand_id', id),
    supabase.from('demand_matches')
      .select(`id, score, score_details, status, matched_at,
        scraped_properties(portal, url, title, tipo_imovel, cidade, bairro,
          area_util, quartos, suites, vagas, valor, cond_valor, amenidades, imagens)`)
      .eq('demand_id', id).order('score', { ascending: false }).limit(50),
    supabase.from('match_jobs').select('status, finished_at, total_found')
      .eq('demand_id', id).order('created_at', { ascending: false }).limit(1).single(),
    supabase.from('saved_demands').select('id').eq('broker_id', user.id).eq('demand_id', id).maybeSingle(),
  ])

  const isOwner = demand.broker_id === user.id
  const isSaved = !!savedRow
  const bairros = locations?.filter((l: any) => l.type === 'bairro').map((l: any) => l.value) ?? []
  const amenImovel = amenidades?.filter((a: any) => !a.amenity.startsWith('[cond]')) ?? []
  const amenCond   = amenidades?.filter((a: any) => a.amenity.startsWith('[cond]')) ?? []

  // Agrupa amenidades do condomínio em subgrupos (heurística por nome)
  const lazerKws = ['academia', 'piscina', 'churrasqueira', 'espaço gourmet', 'espaço verde', 'jardim',
    'playground', 'quadra', 'salão de festas', 'salão de jogos', 'sauna', 'spa', 'rooftop', 'espaço pet',
    'brinquedoteca', 'padel', 'squash']
  const segKws = ['portaria', 'condomínio fechado', 'portão', 'circuito', 'sistema de alarme', 'cftv']
  function classifyAmenCond(name: string) {
    const lower = name.toLowerCase()
    if (lazerKws.some(k => lower.includes(k))) return 'lazer'
    if (segKws.some(k => lower.includes(k))) return 'seguranca'
    return 'infra'
  }
  const condLazer = amenCond.filter((a: any) => classifyAmenCond(a.amenity.replace('[cond] ', '')) === 'lazer')
  const condInfra = amenCond.filter((a: any) => classifyAmenCond(a.amenity.replace('[cond] ', '')) === 'infra')
  const condSeg   = amenCond.filter((a: any) => classifyAmenCond(a.amenity.replace('[cond] ', '')) === 'seguranca')

  // URLs de busca — monta DemandForMatch diretamente (sem chamar admin client)
  const demandForUrls: DemandForMatch = {
    id: demand.id,
    finalidade: demand.finalidade,
    tipo_imovel: demand.tipo_imovel,
    estado: demand.estado,
    cidade: demand.cidade,
    bairros,
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
    amenidades_imovel: amenImovel.map((a: any) => ({ amenity: a.amenity, priority: a.priority })),
    amenidades_cond: amenCond.map((a: any) => ({ amenity: a.amenity, priority: a.priority })),
  }
  const portalUrls = getPortalSearchUrls(demandForUrls)

  const dt = new Date(demand.created_at)
  const dataFormatada = dt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="bg-white border-b border-stone-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/demandas" className="text-xl font-serif font-medium text-emerald-800">
            i<em className="font-light text-stone-400 not-italic">Match</em>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/demandas" className="text-sm text-stone-500 hover:text-stone-800">← Demandas</Link>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">

        {/* ── CABEÇALHO ── */}
        <div className="bg-white rounded-xl border border-stone-200 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  demand.finalidade === 'compra' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                }`}>
                  {demand.finalidade === 'compra' ? 'Compra' : 'Aluguel'}
                </span>
              </div>
              <h1 className="text-2xl font-semibold text-stone-800">{demand.tipo_imovel}</h1>
              {(demand.cidade || bairros.length > 0) && (
                <p className="text-stone-500 mt-1">
                  📍 {[...bairros, demand.cidade, demand.estado].filter(Boolean).join(', ')}
                </p>
              )}
              <p className="text-xs text-stone-400 mt-1.5">
                Cadastrada em {dataFormatada}
                {demand.profiles && <> · Por <strong className="text-stone-600">{(demand.profiles as any).full_name}</strong></>}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <SaveButton demandId={id} isSaved={isSaved} size="md" />
              {isOwner && <MatchTrigger demandId={id} lastJob={lastJob} />}
            </div>
          </div>
        </div>

        {/* ── CRITÉRIOS NUMÉRICOS ── */}
        <Section title="Critérios">
          <Row label="Quartos mínimos"  value={demand.quartos_min  ? `${demand.quartos_min}+`  : null} prio={demand.quartos_prio} />
          <Row label="Suítes mínimas"   value={demand.suites_min   ? `${demand.suites_min}+`   : null} prio={demand.suites_prio} />
          <Row label="Banheiros mínimos" value={demand.banheiros_min ? `${demand.banheiros_min}+` : null} prio={demand.banheiros_prio} />
          <Row label="Vagas mínimas"    value={demand.vagas_min    ? `${demand.vagas_min}+`    : null} prio={demand.vagas_prio} />
          <Row label="Área mínima"      value={demand.area_min     ? `${demand.area_min} m²`   : null} prio={demand.area_min_prio} />
          <Row label="Área máxima"      value={demand.area_max     ? `${demand.area_max} m²`   : null} prio={demand.area_max_prio} />
          <Row label="Valor mínimo"     value={fmtBRL(demand.valor_min)} prio={demand.valor_min_prio} />
          <Row label="Valor máximo"     value={fmtBRL(demand.valor_max)} prio={demand.valor_max_prio} />
          <Row label="Condomínio máx."  value={fmtBRL(demand.cond_max)}  prio={demand.cond_prio} />
          <Row label="IPTU máx./mês"    value={fmtBRL(demand.iptu_max)}  prio={demand.iptu_prio} />
        </Section>

        {/* ── CONDIÇÕES ── */}
        {(demand.aceita_financiamento || demand.aceita_permuta || demand.prazo_meses || demand.subtipo) && (
          <Section title="Condições">
            {demand.subtipo && <Row label="Subtipo" value={demand.subtipo} />}
            <Row label="Aceita financiamento" value={demand.aceita_financiamento === 'on' ? 'Sim' : demand.aceita_financiamento === 'off' ? 'Não' : null} />
            <Row label="Aceita permuta"       value={demand.aceita_permuta === 'on' ? 'Sim' : demand.aceita_permuta === 'off' ? 'Não' : null} />
            {demand.prazo_meses && (
              <Row label="Prazo"
                value={`${demand.prazo_meses} ${demand.prazo_meses === 1 ? 'mês' : 'meses'}${demand.prazo_unidade === 'anos' ? ` (${Math.round(demand.prazo_meses / 12)} anos)` : ''}`}
              />
            )}
          </Section>
        )}

        {/* ── AMENIDADES DO IMÓVEL ── */}
        {amenImovel.length > 0 && (
          <Section title="Características do imóvel">
            <AmenList items={amenImovel} />
          </Section>
        )}

        {/* ── AMENIDADES DO CONDOMÍNIO ── */}
        {amenCond.length > 0 && (
          <Section title="Características do condomínio">
            {condLazer.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">Lazer e esporte</p>
                <AmenList items={condLazer} strip />
              </div>
            )}
            {condInfra.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">Infraestrutura</p>
                <AmenList items={condInfra} strip />
              </div>
            )}
            {condSeg.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">Segurança</p>
                <AmenList items={condSeg} strip />
              </div>
            )}
          </Section>
        )}

        {/* ── OBSERVAÇÕES ── */}
        {demand.observacoes && (
          <Section title="Observações">
            <p className="text-sm text-stone-700 leading-relaxed">{demand.observacoes}</p>
          </Section>
        )}

        {/* ── BUSCAR NOS PORTAIS ── */}
        <Section title="Buscar nos portais">
          <div className="flex flex-wrap gap-2 pt-1">
            {Object.entries(portalUrls).map(([portal, url]) => {
              const meta = PORTAL_LABELS[portal] ?? { name: portal, color: 'bg-stone-100 text-stone-600 border-stone-200' }
              return (
                <a key={portal} href={url} target="_blank" rel="noopener noreferrer"
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border ${meta.color} hover:opacity-80 transition-opacity`}>
                  {meta.name} ↗
                </a>
              )
            })}
          </div>
          <p className="text-xs text-stone-400 mt-2">Abre a busca filtrada em cada portal</p>
        </Section>

        {/* ── MATCHES AUTOMÁTICOS ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-stone-700">
              Matches automáticos
              {matches && matches.length > 0 && (
                <span className="ml-2 font-normal text-stone-400 text-sm">
                  {matches.length} encontrado{matches.length !== 1 ? 's' : ''}
                </span>
              )}
            </h2>
            {lastJob?.finished_at && (
              <span className="text-xs text-stone-400">
                Atualizado em {new Date(lastJob.finished_at).toLocaleDateString('pt-BR')}
              </span>
            )}
          </div>

          {!matches || matches.length === 0 ? (
            <div className="bg-white rounded-xl border border-stone-200 p-8 text-center">
              <p className="text-stone-400 text-sm">Nenhum match encontrado ainda.</p>
              {isOwner && <p className="text-stone-400 text-xs mt-1">Clique em "Buscar matches" para iniciar.</p>}
            </div>
          ) : (
            <div className="space-y-3">
              {matches.map((m: any) => <MatchCard key={m.id} match={m} />)}
            </div>
          )}
        </div>

      </main>
    </div>
  )
}

// ── Helpers de layout ──

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-stone-200 px-5 py-4">
      <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-3">{title}</h2>
      {children}
    </div>
  )
}

function AmenList({ items, strip }: { items: any[]; strip?: boolean }) {
  return (
    <div className="space-y-1.5">
      {items.map((a: any) => {
        const label = strip ? a.amenity.replace('[cond] ', '') : a.amenity
        return (
          <div key={a.amenity} className="flex items-center gap-2 text-sm">
            <span className={a.priority === 'req' ? 'text-emerald-600' : 'text-amber-500'}>
              {a.priority === 'req' ? '✓' : '★'}
            </span>
            <span className="text-stone-700">{label}</span>
            <PrioLabel p={a.priority} />
          </div>
        )
      })}
    </div>
  )
}


