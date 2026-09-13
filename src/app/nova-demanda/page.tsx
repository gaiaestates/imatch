'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const ESTADOS = [
  { uf: 'AC', nome: 'Acre' }, { uf: 'AL', nome: 'Alagoas' }, { uf: 'AP', nome: 'Amapá' },
  { uf: 'AM', nome: 'Amazonas' }, { uf: 'BA', nome: 'Bahia' }, { uf: 'CE', nome: 'Ceará' },
  { uf: 'DF', nome: 'Distrito Federal' }, { uf: 'ES', nome: 'Espírito Santo' }, { uf: 'GO', nome: 'Goiás' },
  { uf: 'MA', nome: 'Maranhão' }, { uf: 'MT', nome: 'Mato Grosso' }, { uf: 'MS', nome: 'Mato Grosso do Sul' },
  { uf: 'MG', nome: 'Minas Gerais' }, { uf: 'PA', nome: 'Pará' }, { uf: 'PB', nome: 'Paraíba' },
  { uf: 'PR', nome: 'Paraná' }, { uf: 'PE', nome: 'Pernambuco' }, { uf: 'PI', nome: 'Piauí' },
  { uf: 'RJ', nome: 'Rio de Janeiro' }, { uf: 'RN', nome: 'Rio Grande do Norte' },
  { uf: 'RS', nome: 'Rio Grande do Sul' }, { uf: 'RO', nome: 'Rondônia' }, { uf: 'RR', nome: 'Roraima' },
  { uf: 'SC', nome: 'Santa Catarina' }, { uf: 'SP', nome: 'São Paulo' },
  { uf: 'SE', nome: 'Sergipe' }, { uf: 'TO', nome: 'Tocantins' },
]

const TIPO_IMOVEL_OPTIONS = [
  'Apartamento', 'Casa', 'Casa em Condomínio', 'Cobertura',
  'Studio', 'Kitnet', 'Terreno', 'Comercial', 'Galpão', 'Sala Comercial',
]

// Amenidades por categoria
const AMENIDADES_PREDIO = [
  'Portaria 24h', 'Elevador', 'Piscina', 'Academia', 'Churrasqueira',
  'Salão de festas', 'Playground', 'Vaga coberta', 'Depósito', 'Gerador', 'Pet friendly', 'Varanda/Sacada',
]
const AMENIDADES_CASA = [
  'Piscina', 'Churrasqueira', 'Jardim', 'Quintal', 'Área de serviço', 'Condomínio fechado', 'Gerador', 'Pet friendly',
]
const AMENIDADES_GERAL = [
  'Portaria 24h', 'Elevador', 'Piscina', 'Academia', 'Churrasqueira',
  'Salão de festas', 'Playground', 'Vaga coberta', 'Depósito', 'Gerador',
  'Pet friendly', 'Varanda/Sacada', 'Jardim', 'Quintal', 'Área de serviço', 'Condomínio fechado',
]

function getAmenidades(tipo: string) {
  if (['Apartamento', 'Cobertura', 'Studio', 'Kitnet'].includes(tipo)) return AMENIDADES_PREDIO
  if (['Casa', 'Casa em Condomínio'].includes(tipo)) return AMENIDADES_CASA
  return AMENIDADES_GERAL
}

// Priority cycle: 0 = nenhum, 1 = preferencial, 2 = obrigatório
type Prio = 0 | 1 | 2
function nextPrio(p: Prio): Prio { return p === 0 ? 1 : p === 1 ? 2 : 0 }

function PrioChip({ value, onToggle }: { value: Prio; onToggle: () => void }) {
  if (value === 0) return (
    <button type="button" onClick={onToggle}
      className="text-xs px-2 py-0.5 rounded-full border border-stone-200 text-stone-400 hover:border-stone-300 transition-colors">
      Qualquer
    </button>
  )
  if (value === 1) return (
    <button type="button" onClick={onToggle}
      className="text-xs px-2 py-0.5 rounded-full border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors">
      Preferencial
    </button>
  )
  return (
    <button type="button" onClick={onToggle}
      className="text-xs px-2 py-0.5 rounded-full border border-emerald-400 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors">
      Obrigatório
    </button>
  )
}

function formatBRL(raw: string) {
  return raw.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}
function parseBRL(v: string) { return v.replace(/\./g, '') }

export default function NovaDemandaPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Localização
  const [estado, setEstado] = useState('')
  const [cidades, setCidades] = useState<string[]>([])
  const [cidadeInput, setCidadeInput] = useState('')
  const [cidadeSuggestions, setCidadeSuggestions] = useState<string[]>([])
  const [loadingCidades, setLoadingCidades] = useState(false)
  const [bairros, setBairros] = useState<string[]>([])
  const [bairroInput, setBairroInput] = useState('')

  // Campos com prioridade
  const [quartos, setQuartos] = useState('')
  const [quartosPrio, setQuartosPrio] = useState<Prio>(0)
  const [suites, setSuites] = useState('')
  const [suitesPrio, setSuitesPrio] = useState<Prio>(0)
  const [banheiros, setBanheiros] = useState('')
  const [banheirosPrio, setBanheirosPrio] = useState<Prio>(0)
  const [vagas, setVagas] = useState('')
  const [vagasPrio, setVagasPrio] = useState<Prio>(0)
  const [areaMin, setAreaMin] = useState('')
  const [areaMax, setAreaMax] = useState('')
  const [areaPrio, setAreaPrio] = useState<Prio>(0)

  // Orçamento
  const [valorMin, setValorMin] = useState('')
  const [valorMax, setValorMax] = useState('')
  const [valorPrio, setValorPrio] = useState<Prio>(0)
  const [condMax, setCondMax] = useState('')
  const [condPrio, setCondPrio] = useState<Prio>(0)

  // Amenidades: Record<amenidade, 0|1|2>
  const [amenidades, setAmenidades] = useState<Record<string, Prio>>({})

  // Prazo
  const [prazoDef, setPrazoDef] = useState(false)
  const [prazoValor, setPrazoValor] = useState('3')
  const [prazoUnidade, setPrazoUnidade] = useState<'meses' | 'anos'>('meses')

  const [form, setForm] = useState({
    finalidade: 'compra',
    tipo_imovel: '',
    aceita_financiamento: false,
    aceita_permuta: false,
    observacoes: '',
  })

  function setF(field: string, value: string | boolean) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  // IBGE: carregar cidades quando estado muda
  useEffect(() => {
    if (!estado) { setCidades([]); setCidadeInput(''); return }
    setLoadingCidades(true)
    setCidadeInput('')
    fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${estado}/municipios?orderBy=nome`)
      .then(r => r.json())
      .then((data: { nome: string }[]) => { setCidades(data.map(d => d.nome)); setLoadingCidades(false) })
      .catch(() => setLoadingCidades(false))
  }, [estado])

  // Sugestões cidade
  useEffect(() => {
    if (!cidadeInput || cidadeInput.length < 2) { setCidadeSuggestions([]); return }
    const lower = cidadeInput.toLowerCase()
    setCidadeSuggestions(cidades.filter(c => c.toLowerCase().includes(lower)).slice(0, 6))
  }, [cidadeInput, cidades])

  function addBairro() {
    const t = bairroInput.trim()
    if (t && !bairros.includes(t)) setBairros(p => [...p, t])
    setBairroInput('')
  }

  function toggleAmenidade(a: string) {
    setAmenidades(prev => ({ ...prev, [a]: nextPrio((prev[a] ?? 0) as Prio) }))
  }

  function urgenciaFromPrazo() {
    if (prazoDef) return 'baixa'
    const meses = prazoUnidade === 'anos' ? Number(prazoValor) * 12 : Number(prazoValor)
    return meses <= 2 ? 'alta' : meses <= 6 ? 'normal' : 'baixa'
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const payload: Record<string, unknown> = {
      broker_id: user.id,
      finalidade: form.finalidade,
      tipo_imovel: form.tipo_imovel || null,
      cidade: cidadeInput || null,
      estado: estado || null,
      // Características (apenas _min, sem _max)
      quartos_min: quartos ? Number(quartos) : null,
      quartos_prio: quartosPrio,
      suites_min: suites ? Number(suites) : null,
      suites_prio: suitesPrio,
      banheiros_min: banheiros ? Number(banheiros) : null,
      banheiros_prio: banheirosPrio,
      vagas_min: vagas ? Number(vagas) : null,
      vagas_prio: vagasPrio,
      area_min: areaMin ? Number(areaMin) : null,
      area_max: areaMax ? Number(areaMax) : null,
      area_prio: areaPrio,
      // Orçamento
      valor_min: valorMin ? Number(parseBRL(valorMin)) : null,
      valor_max: valorMax ? Number(parseBRL(valorMax)) : null,
      valor_prio: valorPrio,
      cond_max: condMax ? Number(parseBRL(condMax)) : null,
      cond_prio: condPrio,
      // Outros
      aceita_financiamento: form.aceita_financiamento,
      aceita_permuta: form.aceita_permuta,
      urgencia: urgenciaFromPrazo(),
      observacoes: [
        !prazoDef ? `Prazo: ${prazoValor} ${prazoUnidade}` : 'Sem prazo definido',
        form.observacoes,
      ].filter(Boolean).join(' | ') || null,
      status: 'ativa',
    }

    const { data: demand, error: demandError } = await supabase
      .from('demands').insert(payload).select('id').single()

    if (demandError) {
      setError('Erro ao cadastrar: ' + demandError.message)
      setLoading(false)
      return
    }

    if (demand?.id) {
      // Bairros
      if (bairros.length > 0) {
        await supabase.from('demand_locations').insert(
          bairros.map(b => ({ demand_id: demand.id, type: 'bairro', value: b }))
        )
      }
      // Amenidades (só prio 1 ou 2)
      const amenRows = Object.entries(amenidades)
        .filter(([, p]) => p > 0)
        .map(([amenity, p]) => ({ demand_id: demand.id, amenity, priority: p === 1 ? 'pref' : 'req' }))
      if (amenRows.length > 0) {
        await supabase.from('demand_amenities').insert(amenRows)
      }
    }

    router.push('/demandas')
    router.refresh()
  }

  const amenidadesLista = getAmenidades(form.tipo_imovel)

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="bg-white border-b border-stone-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/demandas" className="text-xl font-serif font-medium text-emerald-800">
            i<em className="font-light text-stone-400 not-italic">Match</em>
          </Link>
          <Link href="/demandas" className="text-sm text-stone-500 hover:text-stone-800 transition-colors">← Voltar</Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h2 className="text-xl font-medium text-stone-800">Nova demanda</h2>
          <p className="text-sm text-stone-500 mt-0.5">Cadastre o que seu cliente está procurando</p>
        </div>

        {/* Legenda de prioridade */}
        <div className="flex items-center gap-3 mb-4 text-xs text-stone-500">
          <span>Clique para definir prioridade:</span>
          <span className="px-2 py-0.5 rounded-full border border-stone-200 text-stone-400">Qualquer</span>
          <span>→</span>
          <span className="px-2 py-0.5 rounded-full border border-amber-300 bg-amber-50 text-amber-700">Preferencial</span>
          <span>→</span>
          <span className="px-2 py-0.5 rounded-full border border-emerald-400 bg-emerald-50 text-emerald-700">Obrigatório</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>
          )}

          {/* Finalidade */}
          <div className="bg-white rounded-xl border border-stone-200 p-4">
            <h3 className="text-sm font-medium text-stone-700 mb-3">Finalidade</h3>
            <div className="flex gap-3">
              {['compra', 'aluguel'].map(f => (
                <button key={f} type="button" onClick={() => setF('finalidade', f)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    form.finalidade === f ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-white text-stone-600 border-stone-300 hover:border-emerald-400'
                  }`}>
                  {f === 'compra' ? 'Compra' : 'Aluguel'}
                </button>
              ))}
            </div>
          </div>

          {/* Tipo */}
          <div className="bg-white rounded-xl border border-stone-200 p-4">
            <h3 className="text-sm font-medium text-stone-700 mb-3">Tipo de imóvel</h3>
            <div className="flex flex-wrap gap-2">
              {TIPO_IMOVEL_OPTIONS.map(tipo => (
                <button key={tipo} type="button"
                  onClick={() => { setF('tipo_imovel', form.tipo_imovel === tipo ? '' : tipo); setAmenidades({}) }}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    form.tipo_imovel === tipo ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-white text-stone-600 border-stone-300 hover:border-emerald-400'
                  }`}>
                  {tipo}
                </button>
              ))}
            </div>
          </div>

          {/* Localização */}
          <div className="bg-white rounded-xl border border-stone-200 p-4 space-y-3">
            <h3 className="text-sm font-medium text-stone-700">Localização</h3>

            <div>
              <label className="block text-xs text-stone-500 mb-1">Estado *</label>
              <select value={estado} onChange={e => setEstado(e.target.value)} required
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white">
                <option value="">Selecione o estado</option>
                {ESTADOS.map(e => <option key={e.uf} value={e.uf}>{e.nome}</option>)}
              </select>
            </div>

            <div className="relative">
              <label className="block text-xs text-stone-500 mb-1">
                Cidade {loadingCidades && <span className="text-stone-400">(carregando...)</span>}
              </label>
              <input type="text" value={cidadeInput} onChange={e => setCidadeInput(e.target.value)}
                disabled={!estado || loadingCidades}
                placeholder={!estado ? 'Selecione o estado primeiro' : 'Digite a cidade'}
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:bg-stone-50 disabled:text-stone-400" />
              {cidadeSuggestions.length > 0 && (
                <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-stone-200 rounded-lg shadow-lg overflow-hidden">
                  {cidadeSuggestions.map(c => (
                    <button key={c} type="button"
                      onClick={() => { setCidadeInput(c); setCidadeSuggestions([]) }}
                      className="w-full text-left px-3 py-2 text-sm text-stone-700 hover:bg-stone-50 border-b border-stone-100 last:border-0">
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs text-stone-500 mb-1">Bairros</label>
              {bairros.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {bairros.map(b => (
                    <span key={b} className="flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full px-2.5 py-0.5 text-xs font-medium">
                      {b}
                      <button type="button" onClick={() => setBairros(p => p.filter(x => x !== b))} className="text-emerald-500 hover:text-emerald-800">×</button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input type="text" value={bairroInput} onChange={e => setBairroInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addBairro() } }}
                  placeholder="Digite e pressione Enter para adicionar"
                  className="flex-1 border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent" />
                <button type="button" onClick={addBairro} disabled={!bairroInput.trim()}
                  className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-lg text-sm transition-colors disabled:opacity-40">
                  + Add
                </button>
              </div>
            </div>
          </div>

          {/* Características */}
          <div className="bg-white rounded-xl border border-stone-200 p-4 space-y-4">
            <h3 className="text-sm font-medium text-stone-700">Características</h3>

            <div className="grid grid-cols-2 gap-3">
              {/* Quartos */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-stone-500">Quartos mín.</label>
                  <PrioChip value={quartosPrio} onToggle={() => setQuartosPrio(nextPrio(quartosPrio))} />
                </div>
                <input type="number" min="0" value={quartos} onChange={e => setQuartos(e.target.value)}
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent" placeholder="—" />
              </div>

              {/* Suítes */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-stone-500">Suítes mín.</label>
                  <PrioChip value={suitesPrio} onToggle={() => setSuitesPrio(nextPrio(suitesPrio))} />
                </div>
                <input type="number" min="0" value={suites} onChange={e => setSuites(e.target.value)}
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent" placeholder="—" />
              </div>

              {/* Banheiros */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-stone-500">Banheiros mín.</label>
                  <PrioChip value={banheirosPrio} onToggle={() => setBanheirosPrio(nextPrio(banheirosPrio))} />
                </div>
                <input type="number" min="0" value={banheiros} onChange={e => setBanheiros(e.target.value)}
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent" placeholder="—" />
              </div>

              {/* Vagas */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-stone-500">Vagas mín.</label>
                  <PrioChip value={vagasPrio} onToggle={() => setVagasPrio(nextPrio(vagasPrio))} />
                </div>
                <input type="number" min="0" value={vagas} onChange={e => setVagas(e.target.value)}
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent" placeholder="—" />
              </div>
            </div>

            {/* Área */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-stone-500">Área (m²)</label>
                <PrioChip value={areaPrio} onToggle={() => setAreaPrio(nextPrio(areaPrio))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input type="number" min="0" value={areaMin} onChange={e => setAreaMin(e.target.value)}
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent" placeholder="Mín." />
                <input type="number" min="0" value={areaMax} onChange={e => setAreaMax(e.target.value)}
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent" placeholder="Máx." />
              </div>
            </div>
          </div>

          {/* Orçamento */}
          <div className="bg-white rounded-xl border border-stone-200 p-4 space-y-3">
            <h3 className="text-sm font-medium text-stone-700">Orçamento (R$)</h3>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-stone-500">Valor do imóvel</label>
                <PrioChip value={valorPrio} onToggle={() => setValorPrio(nextPrio(valorPrio))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-stone-400">R$</span>
                  <input type="text" inputMode="numeric" value={valorMin} onChange={e => setValorMin(formatBRL(e.target.value))}
                    className="w-full border border-stone-300 rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent" placeholder="Mín." />
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-stone-400">R$</span>
                  <input type="text" inputMode="numeric" value={valorMax} onChange={e => setValorMax(formatBRL(e.target.value))}
                    className="w-full border border-stone-300 rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent" placeholder="Máx." />
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-stone-500">Condomínio máx.</label>
                <PrioChip value={condPrio} onToggle={() => setCondPrio(nextPrio(condPrio))} />
              </div>
              <div className="relative w-1/2">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-stone-400">R$</span>
                <input type="text" inputMode="numeric" value={condMax} onChange={e => setCondMax(formatBRL(e.target.value))}
                  className="w-full border border-stone-300 rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent" placeholder="0" />
              </div>
            </div>

            {form.finalidade === 'compra' && (
              <div className="flex flex-wrap gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.aceita_financiamento} onChange={e => setF('aceita_financiamento', e.target.checked)} className="w-4 h-4 accent-emerald-700" />
                  <span className="text-sm text-stone-600">Aceita financiamento</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.aceita_permuta} onChange={e => setF('aceita_permuta', e.target.checked)} className="w-4 h-4 accent-emerald-700" />
                  <span className="text-sm text-stone-600">Aceita permuta</span>
                </label>
              </div>
            )}
          </div>

          {/* Amenidades */}
          <div className="bg-white rounded-xl border border-stone-200 p-4">
            <h3 className="text-sm font-medium text-stone-700 mb-3">Características desejadas</h3>
            <div className="flex flex-wrap gap-2">
              {amenidadesLista.map(a => {
                const prio = (amenidades[a] ?? 0) as Prio
                return (
                  <button key={a} type="button" onClick={() => toggleAmenidade(a)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      prio === 0 ? 'bg-white text-stone-500 border-stone-200 hover:border-stone-300' :
                      prio === 1 ? 'bg-amber-50 text-amber-700 border-amber-300' :
                                   'bg-emerald-50 text-emerald-700 border-emerald-400'
                    }`}>
                    {prio === 1 && '★ '}{prio === 2 && '✓ '}{a}
                  </button>
                )
              })}
            </div>
            <p className="text-xs text-stone-400 mt-2">Clique uma vez = Preferencial · Duas vezes = Obrigatório · Três vezes = Remover</p>
          </div>

          {/* Prazo */}
          <div className="bg-white rounded-xl border border-stone-200 p-4 space-y-3">
            <h3 className="text-sm font-medium text-stone-700">Prazo</h3>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={prazoDef} onChange={e => setPrazoDef(e.target.checked)} className="w-4 h-4 accent-emerald-700" />
              <span className="text-sm text-stone-600">Sem prazo definido</span>
            </label>
            {!prazoDef && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-stone-500 shrink-0">Encontrar em até</span>
                <select value={prazoValor} onChange={e => setPrazoValor(e.target.value)}
                  className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white w-20">
                  {(prazoUnidade === 'meses' ? Array.from({ length: 12 }, (_, i) => i + 1) : Array.from({ length: 5 }, (_, i) => i + 1))
                    .map(n => <option key={n} value={n}>{n}</option>)}
                </select>
                <select value={prazoUnidade} onChange={e => { setPrazoUnidade(e.target.value as 'meses' | 'anos'); setPrazoValor('1') }}
                  className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white">
                  <option value="meses">meses</option>
                  <option value="anos">anos</option>
                </select>
              </div>
            )}
          </div>

          {/* Observações */}
          <div className="bg-white rounded-xl border border-stone-200 p-4">
            <h3 className="text-sm font-medium text-stone-700 mb-2">Observações</h3>
            <textarea value={form.observacoes} onChange={e => setF('observacoes', e.target.value)} rows={3}
              className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
              placeholder="Detalhes adicionais sobre a demanda do cliente..." />
          </div>

          <div className="flex gap-3 pb-8">
            <Link href="/demandas" className="flex-1 text-center py-2.5 rounded-lg border border-stone-300 text-sm text-stone-600 hover:bg-stone-50 transition-colors">
              Cancelar
            </Link>
            <button type="submit" disabled={loading || !estado}
              className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white font-medium py-2.5 rounded-lg text-sm transition-colors disabled:opacity-60">
              {loading ? 'Publicando...' : 'Publicar demanda'}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
