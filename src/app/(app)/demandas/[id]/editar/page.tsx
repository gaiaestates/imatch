'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ESTADOS, TIPOS_IMOVEL, ESTADOS_IMOVEL, AMEN_IMOVEL, AMEN_COND, AMEN_COND_GRUPOS, IS_CONDO_TIPO,
  getTipoCategoria, type Prio, nextPrio, formatBRL, parseBRL, parseObservacoes,
} from '@/lib/demanda-constants'

function PrioChip({ value, onToggle }: { value: Prio; onToggle: () => void }) {
  if (!value) return (
    <button type="button" onClick={onToggle}
      className="text-xs px-2 py-0.5 rounded-full border border-stone-200 text-stone-400 hover:border-stone-300 transition-colors whitespace-nowrap">
      Qualquer
    </button>
  )
  if (value === 'pref') return (
    <button type="button" onClick={onToggle}
      className="text-xs px-2 py-0.5 rounded-full border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors whitespace-nowrap">
      Preferencial
    </button>
  )
  return (
    <button type="button" onClick={onToggle}
      className="text-xs px-2 py-0.5 rounded-full border border-emerald-400 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors whitespace-nowrap">
      Obrigatório
    </button>
  )
}

function AmenChip({ label, value, onToggle }: { label: string; value: Prio; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle}
      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
        !value   ? 'bg-white text-stone-500 border-stone-200 hover:border-stone-300' :
        value === 'pref' ? 'bg-amber-50 text-amber-700 border-amber-300' :
                   'bg-emerald-50 text-emerald-700 border-emerald-400'
      }`}>
      {value === 'pref' && '★ '}{value === 'req' && '✓ '}{label}
    </button>
  )
}

export default function EditarDemandaPage() {
  const router = useRouter()
  const { id } = useParams() as { id: string }
  const supabase = createClient()

  const [initialLoading, setInitialLoading] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // ── IA ──
  const [textoIA, setTextoIA] = useState('')
  const [iaLoading, setIaLoading] = useState(false)
  const [iaAberto, setIaAberto] = useState(false)
  const [iaBanner, setIaBanner] = useState<string | null>(null)
  const [iaNaoIdentificado, setIaNaoIdentificado] = useState<Set<string>>(new Set())
  const pendingCityRef = useRef<string | null>(null)

  // Form state
  const [tiposSelecionados, setTiposSelecionados] = useState<string[]>([])
  const [estadoImovel, setEstadoImovel] = useState<string[]>([])
  const [estado, setEstado] = useState('')
  const [cidades, setCidades] = useState<{id: number; nome: string}[]>([])
  const [cidadeInput, setCidadeInput] = useState('')
  const [cidadeSuggestions, setCidadeSuggestions] = useState<string[]>([])
  const [loadingCidades, setLoadingCidades] = useState(false)
  const [distritos, setDistritos] = useState<string[]>([])
  const [bairros, setBairros] = useState<string[]>([])
  const [bairroInput, setBairroInput] = useState('')
  const [bairroSuggestions, setBairroSuggestions] = useState<string[]>([])
  const bairroRef = useRef<HTMLDivElement>(null)
  const [areaMin, setAreaMin] = useState('')
  const [areaMax, setAreaMax] = useState('')
  const [areaMinPrio, setAreaMinPrio] = useState<Prio>(null)
  const [areaMaxPrio, setAreaMaxPrio] = useState<Prio>(null)
  const [quartos, setQuartos] = useState('')
  const [quartosPrio, setQuartosPrio] = useState<Prio>(null)
  const [suites, setSuites] = useState('')
  const [suitesPrio, setSuitesPrio] = useState<Prio>(null)
  const [banheiros, setBanheiros] = useState('')
  const [banheirosPrio, setBanheirosPrio] = useState<Prio>(null)
  const [vagas, setVagas] = useState('')
  const [vagasPrio, setVagasPrio] = useState<Prio>(null)
  const [valorMin, setValorMin] = useState('')
  const [valorMax, setValorMax] = useState('')
  const [valorMinPrio, setValorMinPrio] = useState<Prio>(null)
  const [valorMaxPrio, setValorMaxPrio] = useState<Prio>(null)
  const [aluguelValorMin, setAluguelValorMin] = useState('')
  const [aluguelValorMax, setAluguelValorMax] = useState('')
  const [aluguelValorMinPrio, setAluguelValorMinPrio] = useState<Prio>(null)
  const [aluguelValorMaxPrio, setAluguelValorMaxPrio] = useState<Prio>(null)
  const [condMax, setCondMax] = useState('')
  const [condPrio, setCondPrio] = useState<Prio>(null)
  const [iptuMax, setIptuMax] = useState('')
  const [iptuPrio, setIptuPrio] = useState<Prio>(null)
  const [amenImovel, setAmenImovel] = useState<Record<string, Prio>>({})
  const [amenCond, setAmenCond] = useState<Record<string, Prio>>({})
  const [compra, setCompra] = useState(true)
  const [aluguel, setAluguel] = useState(false)
  const finalidade = compra && aluguel ? 'ambos' : aluguel ? 'aluguel' : 'compra'
  const [aceitaFin, setAceitaFin] = useState(false)
  const [aceitaPerm, setAceitaPerm] = useState(false)
  const [prazoDef, setPrazoDef] = useState(false)
  const [prazoValor, setPrazoValor] = useState('3')
  const [prazoUnidade, setPrazoUnidade] = useState<'meses' | 'anos'>('meses')
  const [observacoes, setObservacoes] = useState('')

  function normalize(s: string) {
    return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  }

  async function fetchDistritos(municipioId: number) {
    try {
      const res = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/municipios/${municipioId}/distritos`)
      const d: {nome: string}[] = await res.json()
      setDistritos(d.map(x => x.nome).sort())
    } catch { setDistritos([]) }
  }

  // IBGE cities
  useEffect(() => {
    if (!estado) { setCidades([]); setCidadeInput(''); setDistritos([]); return }
    setLoadingCidades(true); setCidadeInput('')
    fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${estado}/municipios?orderBy=nome`)
      .then(r => r.json())
      .then((d: {id: number; nome: string}[]) => {
        setCidades(d)
        setLoadingCidades(false)
        if (pendingCityRef.current) {
          const pending = pendingCityRef.current
          pendingCityRef.current = null
          const match = d.find(c => normalize(c.nome) === normalize(pending))
          if (match) { setCidadeInput(match.nome); fetchDistritos(match.id) }
          else setCidadeInput(pending)
        }
      })
      .catch(() => setLoadingCidades(false))
  }, [estado])

  useEffect(() => {
    if (!cidadeInput || cidadeInput.length < 2) { setCidadeSuggestions([]); return }
    const nq = normalize(cidadeInput)
    setCidadeSuggestions(cidades.filter(c => normalize(c.nome).includes(nq)).map(c => c.nome).slice(0, 6))
  }, [cidadeInput, cidades])

  // Bairros: IBGE distritos (client-side) + demand_locations (Supabase)
  useEffect(() => {
    if (!bairroInput || bairroInput.length < 2) { setBairroSuggestions([]); return }
    const nq = normalize(bairroInput)
    const fromDistritos = distritos
      .filter(d => normalize(d).includes(nq) && !bairros.includes(d))
      .slice(0, 5)
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('demand_locations')
        .select('value')
        .eq('type', 'bairro')
        .ilike('value', `%${bairroInput}%`)
        .limit(8)
      const fromDB = data
        ? [...new Set(data.map((r: any) => r.value as string))].filter(b => !bairros.includes(b) && !fromDistritos.includes(b))
        : []
      setBairroSuggestions([...fromDistritos, ...fromDB].slice(0, 8))
    }, 200)
    return () => clearTimeout(timer)
  }, [bairroInput, bairros, distritos])

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (bairroRef.current && !bairroRef.current.contains(e.target as Node)) {
        setBairroSuggestions([])
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Fetch demand on mount
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const [{ data: demand }, { data: locations }, { data: amenidades }, { data: myProfile }] = await Promise.all([
        supabase.from('demands').select('*').eq('id', id).single(),
        supabase.from('demand_locations').select('type, value').eq('demand_id', id),
        supabase.from('demand_amenities').select('amenity, priority').eq('demand_id', id),
        supabase.from('profiles').select('is_admin').eq('id', user.id).single(),
      ])

      if (!demand) { router.push('/demandas'); return }
      const isAdmin = (myProfile as any)?.is_admin === true
      if (demand.broker_id !== user.id && !isAdmin) { router.push(`/demandas/${id}`); return }

      // Finalidade
      setCompra(demand.finalidade === 'compra' || demand.finalidade === 'ambos')
      setAluguel(demand.finalidade === 'aluguel' || demand.finalidade === 'ambos')

      // Tipos
      if (demand.tipo_imovel) setTiposSelecionados(demand.tipo_imovel.split(', '))
      if (demand.subtipo) setEstadoImovel(demand.subtipo.split(', '))

      // Localização
      if (demand.estado) {
        setEstado(demand.estado)
        if (demand.cidade) pendingCityRef.current = demand.cidade
      }
      const bairroList = (locations ?? []).filter((l: any) => l.type === 'bairro').map((l: any) => l.value as string)
      setBairros(bairroList)

      // Área
      if (demand.area_min) setAreaMin(String(demand.area_min))
      if (demand.area_max) setAreaMax(String(demand.area_max))
      setAreaMinPrio(demand.area_min_prio ?? null)
      setAreaMaxPrio(demand.area_max_prio ?? null)

      // Características
      if (demand.quartos_min)   setQuartos(String(demand.quartos_min))
      if (demand.suites_min)    setSuites(String(demand.suites_min))
      if (demand.banheiros_min) setBanheiros(String(demand.banheiros_min))
      if (demand.vagas_min)     setVagas(String(demand.vagas_min))
      setQuartosPrio(demand.quartos_prio ?? null)
      setSuitesPrio(demand.suites_prio ?? null)
      setBanheirosPrio(demand.banheiros_prio ?? null)
      setVagasPrio(demand.vagas_prio ?? null)

      // Financeiro
      const brl = (v: number | null) => v ? formatBRL(String(Math.round(v))) : ''
      if (demand.valor_min) setValorMin(brl(demand.valor_min))
      if (demand.valor_max) setValorMax(brl(demand.valor_max))
      if (demand.aluguel_valor_min) setAluguelValorMin(brl(demand.aluguel_valor_min))
      if (demand.aluguel_valor_max) setAluguelValorMax(brl(demand.aluguel_valor_max))
      if (demand.cond_max)  setCondMax(brl(demand.cond_max))
      if (demand.iptu_max)  setIptuMax(brl(demand.iptu_max))
      setValorMinPrio(demand.valor_min_prio ?? null)
      setValorMaxPrio(demand.valor_max_prio ?? null)
      setAluguelValorMinPrio(demand.aluguel_valor_min_prio ?? null)
      setAluguelValorMaxPrio(demand.aluguel_valor_max_prio ?? null)
      setCondPrio(demand.cond_prio ?? null)
      setIptuPrio(demand.iptu_prio ?? null)
      setAceitaFin(demand.aceita_financiamento === 'on')
      setAceitaPerm(demand.aceita_permuta === 'on')

      // Prazo + observações
      const parsed = parseObservacoes(demand.observacoes)
      setPrazoDef(parsed.prazoDef)
      setPrazoValor(parsed.prazoValor)
      setPrazoUnidade(parsed.prazoUnidade)
      setObservacoes(parsed.obs)

      // Amenidades
      const amenImovelMap: Record<string, Prio> = {}
      const amenCondMap: Record<string, Prio> = {}
      for (const a of (amenidades ?? [])) {
        if (a.amenity.startsWith('[cond] ')) {
          amenCondMap[a.amenity.replace('[cond] ', '')] = a.priority as Prio
        } else {
          amenImovelMap[a.amenity] = a.priority as Prio
        }
      }
      setAmenImovel(amenImovelMap)
      setAmenCond(amenCondMap)

      setInitialLoading(false)
    }
    load()
  }, [id])

  function toggleTipo(tipo: string) {
    setTiposSelecionados(prev => {
      const next = prev.includes(tipo) ? prev.filter(t => t !== tipo) : [...prev, tipo]
      if (next.length === 0) { setAmenImovel({}); setAmenCond({}) }
      return next
    })
  }

  function toggleEstadoImovel(est: string) {
    setEstadoImovel(prev => prev.includes(est) ? prev.filter(e => e !== est) : [...prev, est])
  }

  function addBairro(valor?: string) {
    const t = (valor ?? bairroInput).trim()
    if (t && !bairros.includes(t)) setBairros(p => [...p, t])
    setBairroInput('')
    setBairroSuggestions([])
  }

  function urgencia() {
    if (prazoDef) return 'baixa'
    const m = prazoUnidade === 'anos' ? Number(prazoValor) * 12 : Number(prazoValor)
    return m <= 2 ? 'alta' : m <= 6 ? 'normal' : 'baixa'
  }

  const cat = tiposSelecionados.length > 0 ? getTipoCategoria(tiposSelecionados[0]) : 'Residencial'
  const showCondo = tiposSelecionados.some(t => IS_CONDO_TIPO.includes(t))

  function iaCls(campo: string) {
    return iaNaoIdentificado.has(campo) ? 'border-amber-400 ring-2 ring-amber-100 bg-amber-50/20' : ''
  }

  async function handleAnalyzeIA() {
    if (!textoIA.trim()) return
    setIaLoading(true)
    try {
      const res = await fetch('/api/ai/extract-demand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textoIA }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      applyIaResult(data)
    } catch {
      setIaBanner('⚠️ Não foi possível analisar o texto. Tente novamente.')
    } finally {
      setIaLoading(false)
    }
  }

  function applyIaResult(data: Record<string, unknown>) {
    const fin = data.finalidade as string | null
    if (fin) { setCompra(fin === 'compra' || fin === 'ambos'); setAluguel(fin === 'aluguel' || fin === 'ambos') }
    const tipos = data.tipos_imovel as string[] | null
    if (tipos?.length) setTiposSelecionados(tipos)
    const uf = data.estado as string | null
    const city = data.cidade as string | null
    if (uf) { setEstado(uf); if (city) pendingCityRef.current = city }
    else if (city) setCidadeInput(city)
    const bairrosIA = data.bairros as string[] | null
    if (bairrosIA?.length) setBairros(bairrosIA)
    const num = (v: unknown) => (v != null ? String(v) : '')
    const brl = (v: unknown) => (v != null ? formatBRL(String(Math.round(Number(v)))) : '')
    if (data.quartos_min)   setQuartos(num(data.quartos_min))
    if (data.suites_min)    setSuites(num(data.suites_min))
    if (data.banheiros_min) setBanheiros(num(data.banheiros_min))
    if (data.vagas_min)     setVagas(num(data.vagas_min))
    if (data.area_min)      setAreaMin(num(data.area_min))
    if (data.area_max)      setAreaMax(num(data.area_max))
    if (data.valor_min)     setValorMin(brl(data.valor_min))
    if (data.valor_max)     setValorMax(brl(data.valor_max))
    if (data.cond_max)      setCondMax(brl(data.cond_max))
    if (data.iptu_max)      setIptuMax(brl(data.iptu_max))
    if (data.observacoes)   setObservacoes(data.observacoes as string)
    const naoId = new Set<string>((data.unidentified as string[] | null) ?? [])
    setIaNaoIdentificado(naoId)
    const encontrados = [fin, tipos?.length, uf, city, bairrosIA?.length, data.quartos_min, data.valor_max, data.area_min].filter(Boolean).length
    if (naoId.size > 0) {
      const LABELS: Record<string, string> = { finalidade: 'Finalidade', tipos_imovel: 'Tipo de imóvel', estado: 'Estado', cidade: 'Cidade' }
      setIaBanner(`✓ ${encontrados} campos identificados — marcados em amarelo não foram detectados: ${[...naoId].map(k => LABELS[k] ?? k).join(', ')}`)
    } else {
      setIaBanner(`✓ ${encontrados} campos identificados. Revise e salve!`)
    }
    setIaAberto(false); setTextoIA('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!compra && !aluguel) { setError('Selecione ao menos uma finalidade.'); return }
    if (tiposSelecionados.length === 0) { setError('Selecione pelo menos um tipo de imóvel.'); return }
    setLoading(true); setError('')

    const payload: Record<string, unknown> = {
      finalidade,
      tipo_imovel: tiposSelecionados.join(', '),
      subtipo: estadoImovel.length > 0 ? estadoImovel.join(', ') : null,
      estado: estado || null,
      cidade: cidadeInput || null,
      area_min: areaMin ? Number(areaMin) : null,
      area_max: areaMax ? Number(areaMax) : null,
      area_min_prio: areaMinPrio,
      area_max_prio: areaMaxPrio,
      quartos_min: quartos ? Number(quartos) : null,
      quartos_prio: quartosPrio,
      suites_min: suites ? Number(suites) : null,
      suites_prio: suitesPrio,
      banheiros_min: banheiros ? Number(banheiros) : null,
      banheiros_prio: banheirosPrio,
      vagas_min: vagas ? Number(vagas) : null,
      vagas_prio: vagasPrio,
      valor_min: valorMin ? Number(parseBRL(valorMin)) : null,
      valor_max: valorMax ? Number(parseBRL(valorMax)) : null,
      valor_min_prio: valorMinPrio,
      valor_max_prio: valorMaxPrio,
      aluguel_valor_min: (finalidade === 'ambos' && aluguelValorMin) ? Number(parseBRL(aluguelValorMin)) : null,
      aluguel_valor_max: (finalidade === 'ambos' && aluguelValorMax) ? Number(parseBRL(aluguelValorMax)) : null,
      aluguel_valor_min_prio: finalidade === 'ambos' ? aluguelValorMinPrio : null,
      aluguel_valor_max_prio: finalidade === 'ambos' ? aluguelValorMaxPrio : null,
      cond_max: condMax ? Number(parseBRL(condMax)) : null,
      cond_prio: condPrio,
      iptu_max: iptuMax ? Number(parseBRL(iptuMax)) : null,
      iptu_prio: iptuPrio,
      aceita_financiamento: aceitaFin ? 'on' : 'off',
      aceita_permuta: aceitaPerm ? 'on' : 'off',
      urgencia: urgencia(),
      observacoes: [
        !prazoDef ? `Prazo: ${prazoValor} ${prazoUnidade}` : 'Sem prazo definido',
        observacoes,
      ].filter(Boolean).join(' | ') || null,
    }

    const { error: updateError } = await supabase.from('demands').update(payload).eq('id', id)
    if (updateError) { setError('Erro ao salvar: ' + updateError.message); setLoading(false); return }

    // Re-insert locations and amenidades
    await supabase.from('demand_locations').delete().eq('demand_id', id)
    if (bairros.length > 0) {
      await supabase.from('demand_locations').insert(bairros.map(b => ({ demand_id: id, type: 'bairro', value: b })))
    }
    await supabase.from('demand_amenities').delete().eq('demand_id', id)
    const amenRows = [
      ...Object.entries(amenImovel).filter(([, p]) => p).map(([a, p]) => ({ demand_id: id, amenity: a, priority: p as string })),
      ...Object.entries(amenCond).filter(([, p]) => p).map(([a, p]) => ({ demand_id: id, amenity: `[cond] ${a}`, priority: p as string })),
    ]
    if (amenRows.length > 0) await supabase.from('demand_amenities').insert(amenRows)

    // Re-trigger matching
    fetch(`/api/match/${id}`, { method: 'POST' }).catch(() => {})

    router.push(`/demandas/${id}`)
    router.refresh()
  }

  if (initialLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <div className="inline-block w-6 h-6 border-2 border-stone-300 border-t-stone-700 rounded-full animate-spin" />
        <p className="text-sm text-stone-400 mt-3">Carregando demanda…</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="mb-4">
        <Link href={`/demandas/${id}`} className="inline-flex items-center gap-1 text-sm text-stone-400 hover:text-stone-700 mb-3">
          ← Demanda
        </Link>
        <h2 className="text-xl font-medium text-stone-800">Editar demanda</h2>
        <p className="text-sm text-stone-500 mt-0.5">Atualize os critérios do cliente</p>
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap items-center gap-2 mb-4 text-xs text-stone-500 bg-white border border-stone-200 rounded-lg px-3 py-2">
        <span className="font-medium">Prioridade:</span>
        <span className="px-2 py-0.5 rounded-full border border-stone-200 text-stone-400">Qualquer</span>→
        <span className="px-2 py-0.5 rounded-full border border-amber-300 bg-amber-50 text-amber-700">★ Preferencial</span>→
        <span className="px-2 py-0.5 rounded-full border border-emerald-400 bg-emerald-50 text-emerald-700">✓ Obrigatório</span>
      </div>

      {/* IA */}
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden mb-4">
        <button type="button" onClick={() => setIaAberto(v => !v)}
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-stone-50 transition-colors text-left">
          <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-emerald-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2a10 10 0 0 1 10 10c0 5.52-4.48 10-10 10S2 17.52 2 12 6.48 2 12 2z"/>
              <path d="M12 16v-4M12 8h.01"/>
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-stone-800">Atualizar com IA</p>
            <p className="text-xs text-stone-400">Descreva as mudanças e a IA atualiza os campos</p>
          </div>
          <svg className={`w-4 h-4 text-stone-400 transition-transform ${iaAberto ? 'rotate-180' : ''}`}
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m6 9 6 6 6-6"/>
          </svg>
        </button>
        {iaAberto && (
          <div className="px-4 pb-4 border-t border-stone-100">
            <p className="text-xs text-stone-500 mt-3 mb-2">Descreva as alterações desejadas</p>
            <textarea value={textoIA} onChange={e => setTextoIA(e.target.value)} rows={4}
              placeholder="Ex: cliente aumentou o orçamento para 2 milhões e agora quer pelo menos 3 vagas"
              className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none" />
            <button type="button" onClick={handleAnalyzeIA} disabled={!textoIA.trim() || iaLoading}
              className="mt-2 inline-flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-60">
              {iaLoading ? (
                <><svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>Analisando…</>
              ) : 'Analisar com IA'}
            </button>
          </div>
        )}
      </div>

      {iaBanner && (
        <div className={`flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm mb-4 border ${
          iaNaoIdentificado.size > 0 ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}>
          <span className="shrink-0 mt-0.5">{iaNaoIdentificado.size > 0 ? '⚠️' : '✓'}</span>
          <span>{iaBanner}</span>
          <button type="button" onClick={() => setIaBanner(null)} className="ml-auto text-stone-400 hover:text-stone-600 shrink-0">×</button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}

        {/* 1 - Finalidade */}
        <div className={`bg-white rounded-xl border p-4 ${iaCls('finalidade') || 'border-stone-200'}`}>
          <h3 className="text-sm font-semibold text-stone-700 mb-3">Finalidade
            {iaNaoIdentificado.has('finalidade') && <span className="ml-2 text-xs font-normal text-amber-600">⚠ não identificado</span>}
          </h3>
          <div className="flex gap-3">
            <button type="button" onClick={() => setCompra(v => !v)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                compra ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-white text-stone-600 border-stone-300 hover:border-emerald-400'
              }`}>Compra</button>
            <button type="button" onClick={() => setAluguel(v => !v)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                aluguel ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-stone-600 border-stone-300 hover:border-blue-400'
              }`}>Aluguel</button>
          </div>
          {!compra && !aluguel && <p className="text-xs text-red-500 mt-2">Selecione ao menos uma finalidade.</p>}
        </div>

        {/* 2 - Tipo de imóvel */}
        <div className={`bg-white rounded-xl border p-4 space-y-4 ${iaCls('tipos_imovel') || 'border-stone-200'}`}>
          <div>
            <h3 className="text-sm font-semibold text-stone-700">
              Tipo de imóvel <span className="text-red-400">*</span>
              {iaNaoIdentificado.has('tipos_imovel') && <span className="ml-2 text-xs font-normal text-amber-600">⚠ não identificado</span>}
              <span className="ml-2 text-xs font-normal text-stone-400">Pode selecionar mais de um</span>
            </h3>
            {tiposSelecionados.length > 0 && <p className="text-xs text-emerald-700 mt-1">{tiposSelecionados.join(' · ')}</p>}
          </div>
          {Object.entries(TIPOS_IMOVEL).map(([categoria, tipos]) => (
            <div key={categoria}>
              <p className="text-xs text-stone-400 font-medium uppercase tracking-wider mb-1.5">{categoria}</p>
              <div className="flex flex-wrap gap-2">
                {tipos.map(tipo => (
                  <button key={tipo} type="button" onClick={() => toggleTipo(tipo)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      tiposSelecionados.includes(tipo) ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-white text-stone-600 border-stone-300 hover:border-emerald-400'
                    }`}>
                    {tiposSelecionados.includes(tipo) && '✓ '}{tipo}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div>
            <p className="text-xs text-stone-400 font-medium uppercase tracking-wider mb-1.5">Estado do imóvel</p>
            <div className="flex flex-wrap gap-2">
              {ESTADOS_IMOVEL.map(est => (
                <button key={est} type="button" onClick={() => toggleEstadoImovel(est)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    estadoImovel.includes(est) ? 'bg-stone-700 text-white border-stone-700' : 'bg-white text-stone-600 border-stone-300 hover:border-stone-500'
                  }`}>
                  {estadoImovel.includes(est) && '✓ '}{est}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 3 - Localização */}
        <div className="bg-white rounded-xl border border-stone-200 p-4 space-y-3">
          <h3 className="text-sm font-semibold text-stone-700">Localização</h3>
          <div>
            <label className="block text-xs text-stone-500 mb-1">
              Estado <span className="text-red-400">*</span>
              {iaNaoIdentificado.has('estado') && <span className="ml-2 text-amber-600">⚠ não identificado</span>}
            </label>
            <select value={estado} onChange={e => setEstado(e.target.value)} required
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white ${iaCls('estado') || 'border-stone-300'}`}>
              <option value="">Selecione o estado</option>
              {ESTADOS.map(e => <option key={e.uf} value={e.uf}>{e.nome}</option>)}
            </select>
          </div>
          <div className="relative">
            <label className="block text-xs text-stone-500 mb-1">
              Cidade {loadingCidades && <span className="text-stone-400">(carregando...)</span>}
              {iaNaoIdentificado.has('cidade') && <span className="ml-2 text-amber-600">⚠ não identificado</span>}
            </label>
            <input type="text" value={cidadeInput} onChange={e => setCidadeInput(e.target.value)}
              disabled={!estado || loadingCidades}
              placeholder={!estado ? 'Selecione o estado primeiro' : 'Digite a cidade'}
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:bg-stone-50 disabled:text-stone-400 ${iaCls('cidade') || 'border-stone-300'}`} />
            {cidadeSuggestions.length > 0 && (
              <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-stone-200 rounded-lg shadow-lg overflow-hidden">
                {cidadeSuggestions.map(c => (
                  <button key={c} type="button" onClick={() => {
                    setCidadeInput(c)
                    setCidadeSuggestions([])
                    const found = cidades.find(x => x.nome === c)
                    if (found) fetchDistritos(found.id)
                  }}
                    className="w-full text-left px-3 py-2 text-sm text-stone-700 hover:bg-stone-50 border-b border-stone-100 last:border-0">{c}</button>
                ))}
              </div>
            )}
          </div>
          <div ref={bairroRef}>
            <label className="block text-xs text-stone-500 mb-1">Bairros</label>
            {bairros.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {bairros.map(b => (
                  <span key={b} className="flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full px-2.5 py-0.5 text-xs font-medium">
                    {b}
                    <button type="button" onClick={() => setBairros(p => p.filter(x => x !== b))} className="text-emerald-500 hover:text-emerald-800 leading-none">×</button>
                  </span>
                ))}
              </div>
            )}
            <div className="relative">
              <div className="flex gap-2">
                <input type="text" value={bairroInput} onChange={e => setBairroInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addBairro() } }}
                  placeholder="Digite o bairro"
                  className="flex-1 border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent" />
                <button type="button" onClick={() => addBairro()} disabled={!bairroInput.trim()}
                  className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-lg text-sm disabled:opacity-40">+ Add</button>
              </div>
              {bairroSuggestions.length > 0 && (
                <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-stone-200 rounded-lg shadow-lg overflow-hidden">
                  {bairroSuggestions.map(b => (
                    <button key={b} type="button" onMouseDown={e => { e.preventDefault(); addBairro(b) }}
                      className="w-full text-left px-3 py-2 text-sm text-stone-700 hover:bg-emerald-50 hover:text-emerald-800 border-b border-stone-100 last:border-0">
                      📍 {b}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <p className="text-xs text-stone-400 mt-1.5">Digite parte do nome e selecione, ou pressione Enter</p>
          </div>
        </div>

        {/* 4 - Área */}
        <div className="bg-white rounded-xl border border-stone-200 p-4 space-y-3">
          <h3 className="text-sm font-semibold text-stone-700">Área (m²)</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Mínimo', val: areaMin, setVal: setAreaMin, prio: areaMinPrio, setPrio: setAreaMinPrio },
              { label: 'Máximo', val: areaMax, setVal: setAreaMax, prio: areaMaxPrio, setPrio: setAreaMaxPrio },
            ].map(({ label, val, setVal, prio, setPrio }) => (
              <div key={label}>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-stone-500">{label}</label>
                  <PrioChip value={prio} onToggle={() => setPrio(nextPrio(prio))} />
                </div>
                <input type="number" min="0" value={val} onChange={e => setVal(e.target.value)}
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent" placeholder="—" />
              </div>
            ))}
          </div>
        </div>

        {/* 5 - Características */}
        <div className="bg-white rounded-xl border border-stone-200 p-4 space-y-4">
          <h3 className="text-sm font-semibold text-stone-700">Características do imóvel</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Quartos mín.', val: quartos, setVal: setQuartos, prio: quartosPrio, setPrio: setQuartosPrio },
              { label: 'Suítes mín.', val: suites, setVal: setSuites, prio: suitesPrio, setPrio: setSuitesPrio },
              { label: 'Banheiros mín.', val: banheiros, setVal: setBanheiros, prio: banheirosPrio, setPrio: setBanheirosPrio },
              { label: 'Vagas mín.', val: vagas, setVal: setVagas, prio: vagasPrio, setPrio: setVagasPrio },
            ].map(({ label, val, setVal, prio, setPrio }) => (
              <div key={label}>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-stone-500">{label}</label>
                  <PrioChip value={prio} onToggle={() => setPrio(nextPrio(prio))} />
                </div>
                <input type="number" min="0" value={val} onChange={e => setVal(e.target.value)}
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent" placeholder="—" />
              </div>
            ))}
          </div>
        </div>

        {/* 6 - Financeiro */}
        <div className="bg-white rounded-xl border border-stone-200 p-4 space-y-3">
          <h3 className="text-sm font-semibold text-stone-700">Financeiro</h3>

          {/* Venda (ou aluguel quando finalidade != 'ambos') */}
          <div>
            <p className="text-xs text-stone-400 font-medium uppercase tracking-wider mb-2">
              {finalidade === 'aluguel' ? 'Valor do aluguel (R$)' : 'Valor de venda (R$)'}
            </p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Mínimo', val: valorMin, setVal: setValorMin, prio: valorMinPrio, setPrio: setValorMinPrio },
                { label: 'Máximo', val: valorMax, setVal: setValorMax, prio: valorMaxPrio, setPrio: setValorMaxPrio },
              ].map(({ label, val, setVal, prio, setPrio }) => (
                <div key={label}>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs text-stone-500">{label}</label>
                    <PrioChip value={prio} onToggle={() => setPrio(nextPrio(prio))} />
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-stone-400">R$</span>
                    <input type="text" inputMode="numeric" value={val} onChange={e => setVal(formatBRL(e.target.value))}
                      className="w-full border border-stone-300 rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent" placeholder="0" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Aluguel separado — só aparece quando finalidade === 'ambos' */}
          {finalidade === 'ambos' && (
            <div>
              <p className="text-xs text-stone-400 font-medium uppercase tracking-wider mb-2">Valor do aluguel (R$)</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Mínimo', val: aluguelValorMin, setVal: setAluguelValorMin, prio: aluguelValorMinPrio, setPrio: setAluguelValorMinPrio },
                  { label: 'Máximo', val: aluguelValorMax, setVal: setAluguelValorMax, prio: aluguelValorMaxPrio, setPrio: setAluguelValorMaxPrio },
                ].map(({ label, val, setVal, prio, setPrio }) => (
                  <div key={label}>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs text-stone-500">{label}</label>
                      <PrioChip value={prio} onToggle={() => setPrio(nextPrio(prio))} />
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-stone-400">R$</span>
                      <input type="text" inputMode="numeric" value={val} onChange={e => setVal(formatBRL(e.target.value))}
                        className="w-full border border-stone-300 rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent" placeholder="0" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Condomínio máx.', val: condMax, setVal: setCondMax, prio: condPrio, setPrio: setCondPrio },
              { label: 'IPTU máx.', val: iptuMax, setVal: setIptuMax, prio: iptuPrio, setPrio: setIptuPrio },
            ].map(({ label, val, setVal, prio, setPrio }) => (
              <div key={label}>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-stone-500">{label}</label>
                  <PrioChip value={prio} onToggle={() => setPrio(nextPrio(prio))} />
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-stone-400">R$</span>
                  <input type="text" inputMode="numeric" value={val} onChange={e => setVal(formatBRL(e.target.value))}
                    className="w-full border border-stone-300 rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent" placeholder="0" />
                </div>
              </div>
            ))}
          </div>
          {(finalidade === 'compra' || finalidade === 'ambos') && (
            <div className="flex flex-wrap gap-4 pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={aceitaFin} onChange={e => setAceitaFin(e.target.checked)} className="w-4 h-4 accent-emerald-700" />
                <span className="text-sm text-stone-600">Aceita financiamento</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={aceitaPerm} onChange={e => setAceitaPerm(e.target.checked)} className="w-4 h-4 accent-emerald-700" />
                <span className="text-sm text-stone-600">Aceita permuta</span>
              </label>
            </div>
          )}
        </div>

        {/* 7 - Amenidades imóvel */}
        {tiposSelecionados.length > 0 && AMEN_IMOVEL[cat]?.length > 0 && (
          <div className="bg-white rounded-xl border border-stone-200 p-4">
            <h3 className="text-sm font-semibold text-stone-700 mb-1">Características do imóvel</h3>
            <p className="text-xs text-stone-400 mb-3">Clique uma vez = preferencial · duas vezes = obrigatório · três vezes = remover</p>
            <div className="flex flex-wrap gap-2">
              {AMEN_IMOVEL[cat].map(a => (
                <AmenChip key={a} label={a} value={amenImovel[a] ?? null}
                  onToggle={() => setAmenImovel(p => ({ ...p, [a]: nextPrio(p[a] ?? null) }))} />
              ))}
            </div>
          </div>
        )}

        {/* 8 - Amenidades condomínio */}
        {showCondo && AMEN_COND[cat]?.length > 0 && (
          <div className="bg-white rounded-xl border border-stone-200 p-4 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-stone-700 mb-0.5">Características do condomínio</h3>
              <p className="text-xs text-stone-400">Clique uma vez = preferencial · duas vezes = obrigatório · três vezes = remover</p>
            </div>
            {AMEN_COND_GRUPOS[cat]?.lazer?.length > 0 && (
              <div>
                <p className="text-xs text-stone-400 font-semibold uppercase tracking-wide mb-2">🏊 Lazer e esporte</p>
                <div className="flex flex-wrap gap-2">
                  {AMEN_COND_GRUPOS[cat].lazer.map(a => (
                    <AmenChip key={a} label={a} value={amenCond[a] ?? null}
                      onToggle={() => setAmenCond(p => ({ ...p, [a]: nextPrio(p[a] ?? null) }))} />
                  ))}
                </div>
              </div>
            )}
            {AMEN_COND_GRUPOS[cat]?.infra?.length > 0 && (
              <div>
                <p className="text-xs text-stone-400 font-semibold uppercase tracking-wide mb-2">🏢 Infraestrutura</p>
                <div className="flex flex-wrap gap-2">
                  {AMEN_COND_GRUPOS[cat].infra.map(a => (
                    <AmenChip key={a} label={a} value={amenCond[a] ?? null}
                      onToggle={() => setAmenCond(p => ({ ...p, [a]: nextPrio(p[a] ?? null) }))} />
                  ))}
                </div>
              </div>
            )}
            {AMEN_COND_GRUPOS[cat]?.seguranca?.length > 0 && (
              <div>
                <p className="text-xs text-stone-400 font-semibold uppercase tracking-wide mb-2">🔒 Segurança</p>
                <div className="flex flex-wrap gap-2">
                  {AMEN_COND_GRUPOS[cat].seguranca.map(a => (
                    <AmenChip key={a} label={a} value={amenCond[a] ?? null}
                      onToggle={() => setAmenCond(p => ({ ...p, [a]: nextPrio(p[a] ?? null) }))} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 9 - Prazo */}
        <div className="bg-white rounded-xl border border-stone-200 p-4 space-y-3">
          <h3 className="text-sm font-semibold text-stone-700">Prazo</h3>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={prazoDef} onChange={e => setPrazoDef(e.target.checked)} className="w-4 h-4 accent-emerald-700" />
            <span className="text-sm text-stone-600">Sem prazo definido</span>
          </label>
          {!prazoDef && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-stone-500 shrink-0">Encontrar em até</span>
              <select value={prazoValor} onChange={e => setPrazoValor(e.target.value)}
                className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white w-20">
                {(prazoUnidade === 'meses' ? Array.from({length:12},(_,i)=>i+1) : Array.from({length:5},(_,i)=>i+1))
                  .map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              <select value={prazoUnidade} onChange={e => { setPrazoUnidade(e.target.value as 'meses'|'anos'); setPrazoValor('1') }}
                className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
                <option value="meses">meses</option>
                <option value="anos">anos</option>
              </select>
            </div>
          )}
        </div>

        {/* 10 - Observações */}
        <div className="bg-white rounded-xl border border-stone-200 p-4">
          <h3 className="text-sm font-semibold text-stone-700 mb-2">Observações</h3>
          <textarea value={observacoes} onChange={e => setObservacoes(e.target.value)} rows={3}
            className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
            placeholder="Detalhes adicionais sobre a demanda do cliente..." />
        </div>

        <div className="flex gap-3 pb-8">
          <Link href={`/demandas/${id}`} className="flex-1 text-center py-2.5 rounded-lg border border-stone-300 text-sm text-stone-600 hover:bg-stone-50 transition-colors">
            Cancelar
          </Link>
          <button type="submit" disabled={loading || !estado || tiposSelecionados.length === 0}
            className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white font-medium py-2.5 rounded-lg text-sm transition-colors disabled:opacity-60">
            {loading ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </div>
      </form>
    </div>
  )
}
