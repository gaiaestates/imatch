'use client'

import { useState } from 'react'

const TYPE_LABELS: Record<string, string> = {
  APARTAMENTO_TIPO:     'Apartamento',
  APARTAMENTO_GARDEN:   'Garden',
  COBERTURA:            'Cobertura',
  DUPLEX:               'Duplex',
  FLAT:                 'Flat',
  KITNET:               'Kitnet',
  LOFT:                 'Loft',
  STUDIO:               'Studio',
  TRIPLEX:              'Triplex',
  CASA_TIPO:            'Casa',
  CASA_DE_VILA:         'Casa de Vila',
  CASA_EM_CONDOMINIO:   'Casa em Condomínio',
  SOBRADO:              'Sobrado',
  CONJUNTO_COMERCIAL:   'Conjunto Comercial',
  EDIFICIO_MONOUSUARIO: 'Edifício',
  GALPAO:               'Galpão',
  LOJA_DE_RUA:          'Loja de Rua',
  LAGE_CORPORATIVA:     'Laje Corporativa',
  TERRENO_RESIDENCIAL:  'Terreno Residencial',
  TERRENO_COMERCIAL:    'Terreno Comercial',
}

function fmtBRL(v: number | null | undefined) {
  if (!v) return null
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(v % 1_000_000 === 0 ? 0 : 1)}M`
  if (v >= 1_000)     return `R$ ${(v / 1_000).toFixed(0)}k`
  return `R$ ${v}`
}

interface Props {
  finalidade:      string
  tipo_imovel:     string | null
  cidade:          string | null
  estado:          string | null
  bairros:         string[]
  quartos_min:     number | null
  quartos_prio?:   string | null
  vagas_min:       number | null
  vagas_prio?:     string | null
  valor_min:       number | null
  valor_min_prio?: string | null
  valor_max:       number | null
  valor_max_prio?: string | null
  area_min:        number | null
  area_min_prio?:  string | null
  cond_max:        number | null
  cond_prio?:      string | null
}

type Check = { label: string; met: boolean; mandatory: boolean }

function calcChecks(p: any, props: Props): Check[] {
  const checks: Check[] = []
  const price = p.values?.sale ?? p.values?.longStay

  if (props.quartos_min) checks.push({
    label: `${props.quartos_min}+ qtos`,
    met: p.rooms != null && p.rooms >= props.quartos_min,
    mandatory: props.quartos_prio === 'req',
  })
  if (props.area_min) checks.push({
    label: `${props.area_min}m²`,
    met: (p.areas?.private ?? 0) >= props.area_min,
    mandatory: props.area_min_prio === 'req',
  })
  if (props.valor_min) checks.push({
    label: `${fmtBRL(props.valor_min)} mín`,
    met: price != null && price >= props.valor_min,
    mandatory: props.valor_min_prio === 'req',
  })
  if (props.valor_max) checks.push({
    label: `${fmtBRL(props.valor_max)} máx`,
    met: price != null && price <= props.valor_max,
    mandatory: props.valor_max_prio === 'req',
  })
  if (props.vagas_min) checks.push({
    label: `${props.vagas_min}+ vagas`,
    met: (p.parkingLots ?? 0) >= props.vagas_min,
    mandatory: props.vagas_prio === 'req',
  })
  if (props.cond_max) {
    const cond = p.values?.condominium
    checks.push({
      label: `cond. ${fmtBRL(props.cond_max)} máx`,
      met: cond != null && cond <= props.cond_max,
      mandatory: props.cond_prio === 'req',
    })
  }
  if (props.bairros.length > 0) {
    const bairro = (p.address?.area ?? '').toLowerCase()
    checks.push({
      label: 'bairro',
      met: props.bairros.some(b =>
        bairro.includes(b.toLowerCase()) || b.toLowerCase().includes(bairro)
      ),
      mandatory: false,
    })
  }

  return checks
}

function scoreOf(checks: Check[]) {
  if (!checks.length) return 1
  return checks.filter(c => c.met).length / checks.length
}

function ScoreBadge({ checks }: { checks: Check[] }) {
  if (!checks.length) return null
  const met   = checks.filter(c => c.met).length
  const total = checks.length
  const hasMandFail = checks.some(c => c.mandatory && !c.met)
  const cls = hasMandFail
    ? 'bg-red-50 border-red-200 text-red-700'
    : met === total
      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
      : 'bg-amber-50 border-amber-200 text-amber-700'
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border leading-none ${cls}`}>
      {met}/{total}
    </span>
  )
}

function CheckRow({ checks }: { checks: Check[] }) {
  if (!checks.length) return null
  return (
    <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-stone-100">
      {checks.map((c, i) => (
        <span key={i} className={`inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded font-medium ${
          c.met
            ? 'text-emerald-700 bg-emerald-50'
            : c.mandatory
              ? 'text-red-600 bg-red-50'
              : 'text-stone-400 bg-stone-50'
        }`}>
          {c.met ? '✓' : '✗'} {c.label}
        </span>
      ))}
    </div>
  )
}

export default function NonstopSearch(props: Props) {
  const { finalidade, tipo_imovel, cidade, estado, bairros,
          quartos_min, vagas_min, valor_min, valor_max, area_min, cond_max } = props

  const [loading,    setLoading]    = useState(false)
  const [properties, setProperties] = useState<any[] | null>(null)
  const [error,      setError]      = useState<string | null>(null)

  async function buscar() {
    setLoading(true)
    setError(null)
    try {
      const qs = new URLSearchParams()
      qs.set('finalidade', finalidade)
      if (tipo_imovel) qs.set('tipo_imovel', tipo_imovel)
      if (cidade)      qs.set('cidade', cidade)
      if (estado)      qs.set('estado', estado)
      if (bairros.length) qs.set('areas', bairros.join(','))
      if (quartos_min) qs.set('quartos_min', String(quartos_min))
      if (vagas_min)   qs.set('vagas_min', String(vagas_min))
      if (valor_min)   qs.set('valor_min', String(valor_min))
      if (valor_max)   qs.set('valor_max', String(valor_max))
      if (area_min)    qs.set('area_min', String(area_min))
      if (cond_max)    qs.set('cond_max', String(cond_max))

      const res = await fetch(`/api/nonstop/search?${qs}`)
      if (!res.ok) throw new Error('Erro na busca')
      const data = await res.json()
      const list = (data.properties ?? []) as any[]

      // Sort by score descending
      const scored = list.map(p => ({ p, checks: calcChecks(p, props) }))
      scored.sort((a, b) => scoreOf(b.checks) - scoreOf(a.checks))
      setProperties(scored.map(s => ({ ...s.p, _checks: s.checks })))
    } catch {
      setError('Não foi possível buscar. Verifique o token da Nonstop.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {properties === null ? (
        <button
          onClick={buscar}
          disabled={loading}
          className="inline-flex items-center gap-2 bg-stone-800 hover:bg-stone-900 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-60"
        >
          {loading ? (
            <>
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Buscando…
            </>
          ) : (
            <>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              Buscar imóveis na Nonstop
            </>
          )}
        </button>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-stone-400">
              {properties.length === 0
                ? 'Nenhum imóvel encontrado com esses critérios.'
                : `${properties.length} imóvel${properties.length !== 1 ? 'is' : ''} encontrado${properties.length !== 1 ? 's' : ''}`}
            </p>
            <button onClick={buscar} disabled={loading}
              className="text-xs text-stone-400 hover:text-stone-700 underline">
              {loading ? 'Atualizando…' : 'Atualizar'}
            </button>
          </div>

          {properties.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {properties.map((p: any) => {
                const price  = fmtBRL(p.values?.sale ?? p.values?.longStay)
                const area   = p.areas?.private
                const label  = TYPE_LABELS[p.type] ?? p.type
                const bairro = p.address?.area
                const city   = p.address?.city
                const checks = (p._checks ?? []) as Check[]
                const href   = p.fullUrl ?? (p.url?.startsWith('http') ? p.url : null)

                return (
                  <a key={p.id} {...(href ? { href, target: '_blank', rel: 'noopener noreferrer' } : {})}
                    className={`group bg-stone-50 border border-stone-200 rounded-xl overflow-hidden transition-all block ${href ? 'hover:border-stone-400 hover:shadow-sm cursor-pointer' : 'cursor-default'}`}>

                    <div className="relative">
                      {p.image ? (
                        <img src={p.image} alt={label}
                          className="w-full h-36 object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="w-full h-36 bg-stone-200 flex items-center justify-center">
                          <svg className="w-8 h-8 text-stone-400" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
                          </svg>
                        </div>
                      )}
                      {checks.length > 0 && (
                        <div className="absolute top-2 right-2">
                          <ScoreBadge checks={checks} />
                        </div>
                      )}
                    </div>

                    <div className="p-3">
                      <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">{label}</p>
                      {(bairro || city) && (
                        <p className="text-xs text-stone-500 mt-0.5">
                          📍 {[bairro, city].filter(Boolean).join(', ')}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {p.rooms != null && (
                          <span className="text-xs bg-white border border-stone-200 text-stone-600 px-1.5 py-0.5 rounded">
                            {p.rooms} qto{p.rooms !== 1 ? 's' : ''}
                          </span>
                        )}
                        {p.parkingLots > 0 && (
                          <span className="text-xs bg-white border border-stone-200 text-stone-600 px-1.5 py-0.5 rounded">
                            {p.parkingLots} vaga{p.parkingLots !== 1 ? 's' : ''}
                          </span>
                        )}
                        {area && (
                          <span className="text-xs bg-white border border-stone-200 text-stone-600 px-1.5 py-0.5 rounded">
                            {area} m²
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-2">
                        {price
                          ? <p className="text-sm font-bold text-stone-800">{price}</p>
                          : <p className="text-xs text-stone-400">A consultar</p>
                        }
                        {href && <span className="text-xs text-emerald-700 font-medium group-hover:underline">Ver imóvel ↗</span>}
                      </div>

                      <CheckRow checks={checks} />
                    </div>
                  </a>
                )
              })}
            </div>
          )}
        </div>
      )}

      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
    </div>
  )
}
