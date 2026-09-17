import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import MatchTrigger from '@/components/MatchTrigger'
import MatchCard from '@/components/MatchCard'
import SaveButton from '@/components/SaveButton'
import DemandActions from '@/components/DemandActions'
import NonstopSearch from '@/components/NonstopSearch'
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

function PrioDot({ p }: { p: string | null | undefined }) {
  if (!p) return null
  return p === 'req'
    ? <span title="Obrigatório" className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-2 shrink-0" />
    : <span title="Preferencial" className="inline-block w-2 h-2 rounded-full bg-amber-400 mr-2 shrink-0" />
}

function Row({ label, value, prio }: { label: string; value: string | null; prio?: string | null }) {
  if (!value) return null
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-stone-100 last:border-0">
      <div className="flex items-center">
        <PrioDot p={prio} />
        <span className="text-sm text-stone-500">{label}</span>
      </div>
      <span className="text-sm font-medium text-stone-800">{value}</span>
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
    .select('*, profiles(full_name, phone, creci, avatar_url, imobiliaria, autonomo)')
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

  const profile = demand.profiles as any
  const corretorNome = profile?.full_name ?? 'o corretor'
  const corretorPhone = profile?.phone ?? ''
  const imobLabel = profile?.autonomo ? 'Autônomo' : (profile?.imobiliaria ?? '')
  const bairrosMsgParts = locations?.filter((l: any) => l.type === 'bairro').map((l: any) => l.value) ?? []
  const locMsg = [...bairrosMsgParts, demand.cidade].filter(Boolean).join(', ')
  const valorMsg = demand.valor_max ? ` até R$ ${Number(demand.valor_max).toLocaleString('pt-BR')}` : ''
  const quartosMsg = demand.quartos_min ? `, ${demand.quartos_min}+ quartos` : ''
  const waMsgText = `Olá ${corretorNome}, gostaria de falar a respeito da demanda que você cadastrou no iMatch:\n\n• ${demand.finalidade === 'compra' ? 'Compra' : 'Aluguel'} de ${demand.tipo_imovel}\n• ${locMsg}${valorMsg}${quartosMsg}\n\nVocê tem algum imóvel disponível?`
  const waPhone = corretorPhone.replace(/\D/g, '').replace(/^0/, '')
  const waPhoneFormatted = waPhone.startsWith('55') ? waPhone : `55${waPhone}`
  const waUrl = corretorPhone ? `https://wa.me/${waPhoneFormatted}?text=${encodeURIComponent(waMsgText)}` : null

  const bairros = locations?.filter((l: any) => l.type === 'bairro').map((l: any) => l.value) ?? []
  const amenImovel = amenidades?.filter((a: any) => !a.amenity.startsWith('[cond]')) ?? []
  const amenCond   = amenidades?.filter((a: any) => a.amenity.startsWith('[cond]')) ?? []

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
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">

      {/* Breadcrumb */}
      <Link href="/demandas" className="inline-flex items-center gap-1 text-sm text-stone-400 hover:text-stone-700 -mb-2">
        ← Demandas
      </Link>

      {/* ── CABEÇALHO ── */}
      <div className="bg-white rounded-xl border border-stone-200 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              {demand.finalidade === 'ambos' ? (
                <>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">Compra</span>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-800">Aluguel</span>
                </>
              ) : (
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  demand.finalidade === 'compra' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                }`}>
                  {demand.finalidade === 'compra' ? 'Compra' : 'Aluguel'}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-semibold text-stone-800">{demand.tipo_imovel}</h1>
            {(demand.cidade || bairros.length > 0) && (
              <p className="text-stone-500 mt-1">
                📍 {[...bairros, demand.cidade, demand.estado].filter(Boolean).join(', ')}
              </p>
            )}
            <p className="text-xs text-stone-400 mt-1.5">
              Cadastrada em {dataFormatada}
            </p>
            {demand.profiles && (
              <div className="flex items-center gap-2 mt-2">
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} alt={corretorNome} className="w-7 h-7 rounded-full object-cover border border-stone-100 shrink-0" />
                  : <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold shrink-0">{corretorNome.charAt(0).toUpperCase()}</div>
                }
                <div className="flex items-center gap-1 flex-wrap">
                  <Link href={`/corretores/${demand.broker_id}`}
                    className="text-sm font-semibold text-blue-900 hover:underline">
                    {corretorNome}
                  </Link>
                  {imobLabel && (
                    <><span className="text-stone-300 text-sm">|</span>
                    <span className="text-sm text-blue-800">{imobLabel}</span></>
                  )}
                  {profile?.creci && <span className="text-xs text-stone-400 ml-1">· CRECI {profile.creci}</span>}
                </div>
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <SaveButton demandId={id} isSaved={isSaved} size="md" />
              {waUrl && !isOwner && (
                <a href={waUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white text-sm font-medium px-3 py-2 rounded-xl transition-colors">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  Falar com {corretorNome.split(' ')[0]}
                </a>
              )}
            </div>
            {isOwner && <MatchTrigger demandId={id} lastJob={lastJob} />}
            {isOwner && <DemandActions demandId={id} />}
          </div>
        </div>
      </div>

      {/* ── CRITÉRIOS ── */}
      <Section title="Critérios">
        {/* legend */}
        <div className="flex items-center gap-4 text-xs text-stone-400 mb-3">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Obrigatório</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Preferencial</span>
        </div>
        <Row label="Tipo de imóvel"    value={demand.tipo_imovel} />
        {bairros.length > 0 && (
          <Row label="Bairros" value={bairros.join(', ')} />
        )}
        <Row label="Quartos mínimos"   value={demand.quartos_min  ? `${demand.quartos_min}+`  : null} prio={demand.quartos_prio} />
        <Row label="Suítes mínimas"    value={demand.suites_min   ? `${demand.suites_min}+`   : null} prio={demand.suites_prio} />
        <Row label="Banheiros mínimos" value={demand.banheiros_min ? `${demand.banheiros_min}+` : null} prio={demand.banheiros_prio} />
        <Row label="Vagas mínimas"     value={demand.vagas_min    ? `${demand.vagas_min}+`    : null} prio={demand.vagas_prio} />
        <Row label="Área mínima"       value={demand.area_min     ? `${demand.area_min} m²`   : null} prio={demand.area_min_prio} />
        <Row label="Área máxima"       value={demand.area_max     ? `${demand.area_max} m²`   : null} prio={demand.area_max_prio} />
        <Row label="Valor mínimo"      value={fmtBRL(demand.valor_min)} prio={demand.valor_min_prio} />
        <Row label="Valor máximo"      value={fmtBRL(demand.valor_max)} prio={demand.valor_max_prio} />
        <Row label="Condomínio máx."   value={fmtBRL(demand.cond_max)}  prio={demand.cond_prio} />
        <Row label="IPTU máx./mês"     value={fmtBRL(demand.iptu_max)}  prio={demand.iptu_prio} />
      </Section>

      {/* ── CONDIÇÕES ── */}
      {(demand.prazo_meses || demand.subtipo) && (
        <Section title="Condições">
          {demand.subtipo && <Row label="Subtipo" value={demand.subtipo} />}
          {demand.prazo_meses && (
            <Row label="Prazo"
              value={`${demand.prazo_meses} ${demand.prazo_meses === 1 ? 'mês' : 'meses'}${demand.prazo_unidade === 'anos' ? ` (${Math.round(demand.prazo_meses / 12)} anos)` : ''}`}
            />
          )}
        </Section>
      )}

      {amenImovel.length > 0 && (
        <Section title="Características do imóvel">
          <AmenList items={amenImovel} />
        </Section>
      )}

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

      {demand.observacoes && (
        <Section title="Observações">
          <p className="text-sm text-stone-700 leading-relaxed">{demand.observacoes}</p>
        </Section>
      )}

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

      {process.env.NONSTOP_API_TOKEN && (
        <Section title="Imóveis na Nonstop">
          <NonstopSearch
            finalidade={demand.finalidade}
            tipo_imovel={demand.tipo_imovel}
            cidade={demand.cidade}
            estado={demand.estado}
            bairros={bairros}
            quartos_min={demand.quartos_min}
            vagas_min={demand.vagas_min}
            valor_max={demand.valor_max}
            area_min={demand.area_min}
            cond_max={demand.cond_max}
          />
        </Section>
      )}

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

    </div>
  )
}

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
            <PrioDot p={a.priority} />
            <span className="text-stone-700">{label}</span>
          </div>
        )
      })}
    </div>
  )
}
