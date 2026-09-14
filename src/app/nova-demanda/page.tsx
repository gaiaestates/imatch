'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

// ------- DADOS ESTÁTICOS -------

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

const TIPOS_IMOVEL: Record<string, string[]> = {
  'Residencial': ['Apartamento', 'Casa', 'Casa em Condomínio', 'Cobertura', 'Studio', 'Kitnet', 'Flat', 'Loft'],
  'Comercial':   ['Sala Comercial', 'Loja', 'Galpão', 'Prédio Comercial', 'Terreno Comercial'],
  'Terreno':     ['Terreno Residencial', 'Terreno Comercial', 'Terreno Rural', 'Chácara', 'Sítio', 'Fazenda'],
}

// Amenidades — alinhadas com terminologia dos portais (ZAP, ImovelWeb, etc.)
// AMEN_IMOVEL: características do próprio imóvel
// AMEN_COND: características do condomínio (lazer, infraestrutura e segurança)

const AMEN_IMOVEL: Record<string, string[]> = {
  'Residencial': [
    // Externo
    'Varanda', 'Varanda gourmet', 'Churrasqueira privativa', 'Piscina privativa',
    'Quintal', 'Jardim privativo', 'Terraço',
    // Interno
    'Ar-condicionado', 'Aquecimento', 'Aquecimento solar', 'Lareira',
    'Armário embutido', 'Armário embutido no quarto', 'Armário na cozinha', 'Armário no banheiro',
    'Closet',
    // Cozinha / serviço
    'Cozinha americana', 'Área de serviço', 'Depósito',
    // Conveniência
    'Escritório/Home office', 'Interfone', 'Mobiliado', 'TV a cabo',
    'Conexão à internet', 'Aceita animais',
    // Vista / localização
    'Vista para o mar', 'Vista para o lago/rio', 'Vista panorâmica',
    // Tecnologia
    'Automação residencial',
  ],
  'Comercial': [
    'Ar-condicionado', 'Copa', 'Recepção', 'Sala de reunião', 'Depósito',
    'Piso elevado', 'Mezanino', 'Automação', 'Vista para a rua', 'Doca de carga',
    'Interfone', 'TV a cabo', 'Conexão à internet',
  ],
  'Terreno': [
    'Muro', 'Portão eletrônico', 'Área verde', 'Nascente/Rio',
    'Plano', 'Aclive', 'Declive', 'Esquina',
  ],
}

// Grupos visuais dentro do condomínio (todos salvos com prefixo [cond] no DB)
type AmenCondGrupos = { lazer: string[]; infra: string[]; seguranca: string[] }
const AMEN_COND_GRUPOS: Record<string, AmenCondGrupos> = {
  'Residencial': {
    lazer: [
      'Academia', 'Churrasqueira', 'Espaço gourmet', 'Espaço verde/Parque',
      'Jardim', 'Piscina', 'Playground', 'Quadra de tênis', 'Quadra poliesportiva',
      'Salão de festas', 'Salão de jogos', 'Sauna', 'Spa',
      'Rooftop', 'Espaço pet', 'Brinquedoteca', 'Quadra de padel', 'Quadra de squash',
    ],
    infra: [
      'Acesso para deficientes', 'Bicicletário', 'Coworking', 'Elevador',
      'Garagem', 'Vaga coberta', 'Vaga de visitante', 'Gerador elétrico',
      'Lavanderia', 'Recepção', 'Depósito/Box',
    ],
    seguranca: [
      'Portaria 24h', 'Portaria virtual', 'Condomínio fechado',
      'Portão eletrônico', 'Circuito de segurança (CFTV)', 'Sistema de alarme',
    ],
  },
  'Comercial': {
    lazer: [],
    infra: [
      'Portaria 24h', 'Elevador', 'Gerador', 'Estacionamento', 'Coworking',
      'Auditório', 'Restaurante no prédio', 'Bicicletário', 'Acesso para deficientes',
    ],
    seguranca: ['Portaria 24h', 'Circuito de segurança (CFTV)', 'Condomínio fechado'],
  },
  'Terreno': { lazer: [], infra: [], seguranca: [] },
}

// Para compatibilidade com o resto do código (upsert no DB)
const AMEN_COND: Record<string, string[]> = {
  'Residencial': [
    ...AMEN_COND_GRUPOS['Residencial'].lazer,
    ...AMEN_COND_GRUPOS['Residencial'].infra,
    ...AMEN_COND_GRUPOS['Residencial'].seguranca,
  ],
  'Comercial': [
    ...AMEN_COND_GRUPOS['Comercial'].infra,
    ...AMEN_COND_GRUPOS['Comercial'].seguranca,
  ],
  'Terreno': [],
}

function getTipoCategoria(tipo: string): string {
  for (const [cat, lista] of Object.entries(TIPOS_IMOVEL)) {
    if (lista.includes(tipo)) return cat
  }
  return 'Residencial'
}

const IS_CONDO_TIPO = ['Apartamento', 'Cobertura', 'Studio', 'Kitnet', 'Flat', 'Loft',
  'Casa em Condomínio', 'Sala Comercial', 'Loja', 'Prédio Comercial']

// ------- HELPERS -------

type Prio = 'pref' | 'req' | null
function nextPrio(p: Prio): Prio { return p === null ? 'pref' : p === 'pref' ? 'req' : null }

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

function formatBRL(raw: string) { return raw.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.') }
function parseBRL(v: string) { return v.replace(/\./g, '') }

// ------- COMPONENT -------

export default function NovaDemandaPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Tipo/subtipo
  const [tipoSelecionado, setTipoSelecionado] = useState('')
  const [subtipo, setSubtipo] = useState('')

  // Localização
  const [estado, setEstado] = useState('')
  const [cidades, setCidades] = useState<string[]>([])
  const [cidadeInput, setCidadeInput] = useState('')
  const [cidadeSuggestions, setCidadeSuggestions] = useState<string[]>([])
  const [loadingCidades, setLoadingCidades] = useState(false)
  const [bairros, setBairros] = useState<string[]>([])
  const [bairroInput, setBairroInput] = useState('')

  // Área
  const [areaMin, setAreaMin] = useState('')
  const [areaMax, setAreaMax] = useState('')
  const [areaMinPrio, setAreaMinPrio] = useState<Prio>(null)
  const [areaMaxPrio, setAreaMaxPrio] = useState<Prio>(null)

  // Características numéricas (com prio TEXT)
  const [quartos, setQuartos] = useState('')
  const [quartosPrio, setQuartosPrio] = useState<Prio>(null)
  const [suites, setSuites] = useState('')
  const [suitesPrio, setSuitesPrio] = useState<Prio>(null)
  const [banheiros, setBanheiros] = useState('')
  const [banheirosPrio, setBanheirosPrio] = useState<Prio>(null)
  const [vagas, setVagas] = useState('')
  const [vagasPrio, setVagasPrio] = useState<Prio>(null)

  // Financeiro
  const [valorMin, setValorMin] = useState('')
  const [valorMax, setValorMax] = useState('')
  const [valorMinPrio, setValorMinPrio] = useState<Prio>(null)
  const [valorMaxPrio, setValorMaxPrio] = useState<Prio>(null)
  const [condMax, setCondMax] = useState('')
  const [condPrio, setCondPrio] = useState<Prio>(null)
  const [iptuMax, setIptuMax] = useState('')
  const [iptuPrio, setIptuPrio] = useState<Prio>(null)

  // Amenidades
  const [amenImovel, setAmenImovel] = useState<Record<string, Prio>>({})
  const [amenCond, setAmenCond] = useState<Record<string, Prio>>({})

  // Outras
  const [finalidade, setFinalidade] = useState('compra')
  const [aceitaFin, setAceitaFin] = useState(false)
  const [aceitaPerm, setAceitaPerm] = useState(false)
  const [prazoDef, setPrazoDef] = useState(false)
  const [prazoValor, setPrazoValor] = useState('3')
  const [prazoUnidade, setPrazoUnidade] = useState<'meses' | 'anos'>('meses')
  const [observacoes, setObservacoes] = useState('')

  // IBGE
  useEffect(() => {
    if (!estado) { setCidades([]); setCidadeInput(''); return }
    setLoadingCidades(true); setCidadeInput('')
    fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${estado}/municipios?orderBy=nome`)
      .then(r => r.json())
      .then((d: { nome: string }[]) => { setCidades(d.map(x => x.nome)); setLoadingCidades(false) })
      .catch(() => setLoadingCidades(false))
  }, [estado])

  useEffect(() => {
    if (!cidadeInput || cidadeInput.length < 2) { setCidadeSuggestions([]); return }
    const low = cidadeInput.toLowerCase()
    setCidadeSuggestions(cidades.filter(c => c.toLowerCase().includes(low)).slice(0, 6))
  }, [cidadeInput, cidades])

  function addBairro() {
    const t = bairroInput.trim()
    if (t && !bairros.includes(t)) setBairros(p => [...p, t])
    setBairroInput('')
  }

  function urgencia() {
    if (prazoDef) return 'baixa'
    const m = prazoUnidade === 'anos' ? Number(prazoValor) * 12 : Number(prazoValor)
    return m <= 2 ? 'alta' : m <= 6 ? 'normal' : 'baixa'
  }

  const cat = getTipoCategoria(tipoSelecionado)
  const showCondo = IS_CONDO_TIPO.includes(tipoSelecionado)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!tipoSelecionado) { setError('Selecione o tipo de imóvel.'); return }
    setLoading(true); setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const payload: Record<string, unknown> = {
      broker_id: user.id,
      finalidade,
      tipo_imovel: tipoSelecionado,
      subtipo: subtipo || null,
      estado: estado || null,
      cidade: cidadeInput || null,
      // Área
      area_min: areaMin ? Number(areaMin) : null,
      area_max: areaMax ? Number(areaMax) : null,
      area_min_prio: areaMinPrio,
      area_max_prio: areaMaxPrio,
      // Características
      quartos_min: quartos ? Number(quartos) : null,
      quartos_prio: quartosPrio,
      suites_min: suites ? Number(suites) : null,
      suites_prio: suitesPrio,
      banheiros_min: banheiros ? Number(banheiros) : null,
      banheiros_prio: banheirosPrio,
      vagas_min: vagas ? Number(vagas) : null,
      vagas_prio: vagasPrio,
      // Financeiro
      valor_min: valorMin ? Number(parseBRL(valorMin)) : null,
      valor_max: valorMax ? Number(parseBRL(valorMax)) : null,
      valor_min_prio: valorMinPrio,
      valor_max_prio: valorMaxPrio,
      cond_max: condMax ? Number(parseBRL(condMax)) : null,
      cond_prio: condPrio,
      iptu_max: iptuMax ? Number(parseBRL(iptuMax)) : null,
      iptu_prio: iptuPrio,
      // Condições
      aceita_financiamento: aceitaFin ? 'on' : 'off',
      aceita_permuta: aceitaPerm ? 'on' : 'off',
      urgencia: urgencia(),
      observacoes: [
        !prazoDef ? `Prazo: ${prazoValor} ${prazoUnidade}` : 'Sem prazo definido',
        observacoes,
      ].filter(Boolean).join(' | ') || null,
      status: 'ativa',
    }

    const { data: demand, error: demandError } = await supabase
      .from('demands').insert(payload).select('id').single()

    if (demandError) { setError('Erro ao cadastrar: ' + demandError.message); setLoading(false); return }

    if (demand?.id) {
      // Bairros
      if (bairros.length > 0) {
        await supabase.from('demand_locations').insert(
          bairros.map(b => ({ demand_id: demand.id, type: 'bairro', value: b }))
        )
      }
      // Amenidades imóvel + condomínio
      const amenRows = [
        ...Object.entries(amenImovel).filter(([, p]) => p).map(([a, p]) => ({ demand_id: demand.id, amenity: a, priority: p as string })),
        ...Object.entries(amenCond).filter(([, p]) => p).map(([a, p]) => ({ demand_id: demand.id, amenity: `[cond] ${a}`, priority: p as string })),
      ]
      if (amenRows.length > 0) await supabase.from('demand_amenities').insert(amenRows)
    }

    // Auto-dispara matching em background (não bloqueia o redirecionamento)
    if (demand?.id) {
      fetch(`/api/match/${demand.id}`, { method: 'POST' }).catch(() => { /* ignora erros — job não-crítico */ })
    }

    router.push(`/demandas/${demand?.id ?? ''}`)
    router.refresh()
  }

  // ---- RENDER ----
  return (
    <div className="min-h-screen bg-stone-50">
      <header className="bg-white border-b border-stone-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/demandas" className="text-xl font-serif font-medium text-emerald-800">
            i<em className="font-light text-stone-400 not-italic">Match</em>
          </Link>
          <Link href="/demandas" className="text-sm text-stone-500 hover:text-stone-800">← Voltar</Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <div className="mb-4">
          <h2 className="text-xl font-medium text-stone-800">Nova demanda</h2>
          <p className="text-sm text-stone-500 mt-0.5">Cadastre o que seu cliente está procurando</p>
        </div>

        {/* Legenda */}
        <div className="flex flex-wrap items-center gap-2 mb-4 text-xs text-stone-500 bg-white border border-stone-200 rounded-lg px-3 py-2">
          <span className="font-medium">Prioridade:</span>
          <span className="px-2 py-0.5 rounded-full border border-stone-200 text-stone-400">Qualquer</span>→
          <span className="px-2 py-0.5 rounded-full border border-amber-300 bg-amber-50 text-amber-700">★ Preferencial</span>→
          <span className="px-2 py-0.5 rounded-full border border-emerald-400 bg-emerald-50 text-emerald-700">✓ Obrigatório</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}

          {/* 1 - Finalidade */}
          <div className="bg-white rounded-xl border border-stone-200 p-4">
            <h3 className="text-sm font-semibold text-stone-700 mb-3">Finalidade</h3>
            <div className="flex gap-3">
              {(['compra', 'aluguel'] as const).map(f => (
                <button key={f} type="button" onClick={() => setFinalidade(f)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    finalidade === f ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-white text-stone-600 border-stone-300 hover:border-emerald-400'
                  }`}>
                  {f === 'compra' ? 'Compra' : 'Aluguel'}
                </button>
              ))}
            </div>
          </div>

          {/* 2 - Tipo de imóvel */}
          <div className="bg-white rounded-xl border border-stone-200 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-stone-700">Tipo de imóvel <span className="text-red-400">*</span></h3>
            {Object.entries(TIPOS_IMOVEL).map(([categoria, tipos]) => (
              <div key={categoria}>
                <p className="text-xs text-stone-400 font-medium uppercase tracking-wider mb-1.5">{categoria}</p>
                <div className="flex flex-wrap gap-2">
                  {tipos.map(tipo => (
                    <button key={tipo} type="button"
                      onClick={() => { setTipoSelecionado(tipoSelecionado === tipo ? '' : tipo); setAmenImovel({}); setAmenCond({}) }}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        tipoSelecionado === tipo ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-white text-stone-600 border-stone-300 hover:border-emerald-400'
                      }`}>
                      {tipo}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {tipoSelecionado && (
              <div>
                <label className="block text-xs text-stone-500 mb-1">Subtipo / complemento <span className="text-stone-300">(opcional)</span></label>
                <input type="text" value={subtipo} onChange={e => setSubtipo(e.target.value)}
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="ex: alto padrão, novo, reformado..." />
              </div>
            )}
          </div>

          {/* 3 - Localização */}
          <div className="bg-white rounded-xl border border-stone-200 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-stone-700">Localização</h3>
            <div>
              <label className="block text-xs text-stone-500 mb-1">Estado <span className="text-red-400">*</span></label>
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
                    <button key={c} type="button" onClick={() => { setCidadeInput(c); setCidadeSuggestions([]) }}
                      className="w-full text-left px-3 py-2 text-sm text-stone-700 hover:bg-stone-50 border-b border-stone-100 last:border-0">{c}</button>
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
                      <button type="button" onClick={() => setBairros(p => p.filter(x => x !== b))} className="text-emerald-500 hover:text-emerald-800 leading-none">×</button>
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
                  className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-lg text-sm disabled:opacity-40">+ Add</button>
              </div>
            </div>
          </div>

          {/* 4 - Área */}
          <div className="bg-white rounded-xl border border-stone-200 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-stone-700">Área (m²)</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-stone-500">Mínimo</label>
                  <PrioChip value={areaMinPrio} onToggle={() => setAreaMinPrio(nextPrio(areaMinPrio))} />
                </div>
                <input type="number" min="0" value={areaMin} onChange={e => setAreaMin(e.target.value)}
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent" placeholder="—" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-stone-500">Máximo</label>
                  <PrioChip value={areaMaxPrio} onToggle={() => setAreaMaxPrio(nextPrio(areaMaxPrio))} />
                </div>
                <input type="number" min="0" value={areaMax} onChange={e => setAreaMax(e.target.value)}
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent" placeholder="—" />
              </div>
            </div>
          </div>

          {/* 5 - Características do imóvel */}
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

            {/* Valor */}
            <div>
              <p className="text-xs text-stone-400 font-medium uppercase tracking-wider mb-2">Valor do imóvel (R$)</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs text-stone-500">Mínimo</label>
                    <PrioChip value={valorMinPrio} onToggle={() => setValorMinPrio(nextPrio(valorMinPrio))} />
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-stone-400">R$</span>
                    <input type="text" inputMode="numeric" value={valorMin} onChange={e => setValorMin(formatBRL(e.target.value))}
                      className="w-full border border-stone-300 rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent" placeholder="0" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs text-stone-500">Máximo</label>
                    <PrioChip value={valorMaxPrio} onToggle={() => setValorMaxPrio(nextPrio(valorMaxPrio))} />
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-stone-400">R$</span>
                    <input type="text" inputMode="numeric" value={valorMax} onChange={e => setValorMax(formatBRL(e.target.value))}
                      className="w-full border border-stone-300 rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent" placeholder="0" />
                  </div>
                </div>
              </div>
            </div>

            {/* Condomínio + IPTU */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-stone-500">Condomínio máx.</label>
                  <PrioChip value={condPrio} onToggle={() => setCondPrio(nextPrio(condPrio))} />
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-stone-400">R$</span>
                  <input type="text" inputMode="numeric" value={condMax} onChange={e => setCondMax(formatBRL(e.target.value))}
                    className="w-full border border-stone-300 rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent" placeholder="0" />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-stone-500">IPTU máx.</label>
                  <PrioChip value={iptuPrio} onToggle={() => setIptuPrio(nextPrio(iptuPrio))} />
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-stone-400">R$</span>
                  <input type="text" inputMode="numeric" value={iptuMax} onChange={e => setIptuMax(formatBRL(e.target.value))}
                    className="w-full border border-stone-300 rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent" placeholder="0" />
                </div>
              </div>
            </div>

            {finalidade === 'compra' && (
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

          {/* 7 - Amenidades do imóvel */}
          {tipoSelecionado && AMEN_IMOVEL[cat]?.length > 0 && (
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

          {/* 8 - Amenidades do condomínio (só para tipos de condomínio) */}
          {showCondo && AMEN_COND[cat]?.length > 0 && (
            <div className="bg-white rounded-xl border border-stone-200 p-4 space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-stone-700 mb-0.5">Características do condomínio</h3>
                <p className="text-xs text-stone-400">Clique uma vez = preferencial · duas vezes = obrigatório · três vezes = remover</p>
              </div>

              {/* Lazer e esporte */}
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

              {/* Infraestrutura */}
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

              {/* Segurança */}
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
            <Link href="/demandas" className="flex-1 text-center py-2.5 rounded-lg border border-stone-300 text-sm text-stone-600 hover:bg-stone-50 transition-colors">
              Cancelar
            </Link>
            <button type="submit" disabled={loading || !estado || !tipoSelecionado}
              className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white font-medium py-2.5 rounded-lg text-sm transition-colors disabled:opacity-60">
              {loading ? 'Publicando...' : 'Publicar demanda'}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
