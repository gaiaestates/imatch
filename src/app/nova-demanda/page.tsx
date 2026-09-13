'use client'

import { useState, useEffect, useRef } from 'react'
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

function formatBRL(raw: string) {
  const digits = raw.replace(/\D/g, '')
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

function parseBRL(formatted: string) {
  return formatted.replace(/\./g, '')
}

export default function NovaDemandaPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Estado/cidade
  const [estado, setEstado] = useState('')
  const [cidades, setCidades] = useState<string[]>([])
  const [cidadeInput, setCidadeInput] = useState('')
  const [cidadeSuggestions, setCidadeSuggestions] = useState<string[]>([])
  const [loadingCidades, setLoadingCidades] = useState(false)

  // Bairros (multi-tag)
  const [bairros, setBairros] = useState<string[]>([])
  const [bairroInput, setBairroInput] = useState('')

  // Valores
  const [valorMin, setValorMin] = useState('')
  const [valorMax, setValorMax] = useState('')

  // Prazo
  const [prazoDef, setPrazoDef] = useState(false) // sem prazo definido
  const [prazoValor, setPrazoValor] = useState('3')
  const [prazoUnidade, setPrazoUnidade] = useState<'meses' | 'anos'>('meses')

  const [form, setForm] = useState({
    finalidade: 'compra',
    tipo_imovel: '',
    quartos_min: '',
    quartos_max: '',
    suites_min: '',
    vagas_min: '',
    area_min: '',
    area_max: '',
    aceita_financiamento: false,
    aceita_permuta: false,
    observacoes: '',
  })

  function set(field: string, value: string | boolean) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  // Buscar cidades do IBGE quando estado muda
  useEffect(() => {
    if (!estado) { setCidades([]); setCidadeInput(''); return }
    setLoadingCidades(true)
    setCidadeInput('')
    fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${estado}/municipios?orderBy=nome`)
      .then(r => r.json())
      .then((data: { nome: string }[]) => {
        setCidades(data.map(d => d.nome))
        setLoadingCidades(false)
      })
      .catch(() => setLoadingCidades(false))
  }, [estado])

  // Sugestões de cidade conforme digita
  useEffect(() => {
    if (!cidadeInput || cidadeInput.length < 2) { setCidadeSuggestions([]); return }
    const lower = cidadeInput.toLowerCase()
    setCidadeSuggestions(cidades.filter(c => c.toLowerCase().includes(lower)).slice(0, 6))
  }, [cidadeInput, cidades])

  // Adicionar bairro
  function addBairro() {
    const trimmed = bairroInput.trim()
    if (trimmed && !bairros.includes(trimmed)) {
      setBairros(prev => [...prev, trimmed])
    }
    setBairroInput('')
  }

  function removeBairro(b: string) {
    setBairros(prev => prev.filter(x => x !== b))
  }

  // Calcular urgência a partir do prazo
  function urgenciaFromPrazo(): string {
    if (prazoDef) return 'baixa'
    const meses = prazoUnidade === 'anos' ? Number(prazoValor) * 12 : Number(prazoValor)
    if (meses <= 2) return 'alta'
    if (meses <= 6) return 'normal'
    return 'baixa'
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
      quartos_min: form.quartos_min ? Number(form.quartos_min) : null,
      quartos_max: form.quartos_max ? Number(form.quartos_max) : null,
      suites_min: form.suites_min ? Number(form.suites_min) : null,
      vagas_min: form.vagas_min ? Number(form.vagas_min) : null,
      area_min: form.area_min ? Number(form.area_min) : null,
      area_max: form.area_max ? Number(form.area_max) : null,
      valor_min: valorMin ? Number(parseBRL(valorMin)) : null,
      valor_max: valorMax ? Number(parseBRL(valorMax)) : null,
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
      .from('demands')
      .insert(payload)
      .select('id')
      .single()

    if (demandError) {
      setError('Erro ao cadastrar: ' + demandError.message)
      setLoading(false)
      return
    }

    if (bairros.length > 0 && demand?.id) {
      await supabase.from('demand_locations').insert(
        bairros.map(b => ({ demand_id: demand.id, type: 'bairro', value: b }))
      )
    }

    router.push('/demandas')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="bg-white border-b border-stone-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/demandas" className="text-xl font-serif font-medium text-emerald-800">
            i<em className="font-light text-stone-400 not-italic">Match</em>
          </Link>
          <Link href="/demandas" className="text-sm text-stone-500 hover:text-stone-800 transition-colors">
            ← Voltar
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h2 className="text-xl font-medium text-stone-800">Nova demanda</h2>
          <p className="text-sm text-stone-500 mt-0.5">Cadastre o que seu cliente está procurando</p>
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
                <button key={f} type="button" onClick={() => set('finalidade', f)}
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
                  onClick={() => set('tipo_imovel', form.tipo_imovel === tipo ? '' : tipo)}
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

            {/* Estado */}
            <div>
              <label className="block text-xs text-stone-500 mb-1">Estado *</label>
              <select
                value={estado}
                onChange={e => setEstado(e.target.value)}
                required
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
              >
                <option value="">Selecione o estado</option>
                {ESTADOS.map(e => (
                  <option key={e.uf} value={e.uf}>{e.nome}</option>
                ))}
              </select>
            </div>

            {/* Cidade */}
            <div className="relative">
              <label className="block text-xs text-stone-500 mb-1">
                Cidade {loadingCidades && <span className="text-stone-400">(carregando...)</span>}
              </label>
              <input
                type="text"
                value={cidadeInput}
                onChange={e => setCidadeInput(e.target.value)}
                disabled={!estado || loadingCidades}
                placeholder={!estado ? 'Selecione o estado primeiro' : 'Digite a cidade'}
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:bg-stone-50 disabled:text-stone-400"
              />
              {cidadeSuggestions.length > 0 && (
                <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-stone-200 rounded-lg shadow-lg overflow-hidden">
                  {cidadeSuggestions.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => { setCidadeInput(c); setCidadeSuggestions([]) }}
                      className="w-full text-left px-3 py-2 text-sm text-stone-700 hover:bg-stone-50 border-b border-stone-100 last:border-0"
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Bairros */}
            <div>
              <label className="block text-xs text-stone-500 mb-1">Bairros</label>
              {bairros.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {bairros.map(b => (
                    <span key={b} className="flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full px-2.5 py-0.5 text-xs font-medium">
                      {b}
                      <button type="button" onClick={() => removeBairro(b)} className="text-emerald-500 hover:text-emerald-800 leading-none">×</button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={bairroInput}
                  onChange={e => setBairroInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addBairro() } if (e.key === ',') { e.preventDefault(); addBairro() } }}
                  placeholder="Digite e pressione Enter para adicionar"
                  className="flex-1 border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={addBairro}
                  disabled={!bairroInput.trim()}
                  className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-lg text-sm transition-colors disabled:opacity-40"
                >
                  + Add
                </button>
              </div>
            </div>
          </div>

          {/* Características */}
          <div className="bg-white rounded-xl border border-stone-200 p-4 space-y-3">
            <h3 className="text-sm font-medium text-stone-700">Características</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { field: 'quartos_min', label: 'Quartos mín.' },
                { field: 'quartos_max', label: 'Quartos máx.' },
                { field: 'suites_min', label: 'Suítes mín.' },
                { field: 'vagas_min', label: 'Vagas mín.' },
              ].map(({ field, label }) => (
                <div key={field}>
                  <label className="block text-xs text-stone-500 mb-1">{label}</label>
                  <input type="number" min="0" value={(form as any)[field]}
                    onChange={e => set(field, e.target.value)}
                    className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="—"
                  />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-stone-500 mb-1">Área mín. (m²)</label>
                <input type="number" min="0" value={form.area_min} onChange={e => set('area_min', e.target.value)}
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent" placeholder="—" />
              </div>
              <div>
                <label className="block text-xs text-stone-500 mb-1">Área máx. (m²)</label>
                <input type="number" min="0" value={form.area_max} onChange={e => set('area_max', e.target.value)}
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent" placeholder="—" />
              </div>
            </div>
          </div>

          {/* Orçamento */}
          <div className="bg-white rounded-xl border border-stone-200 p-4 space-y-3">
            <h3 className="text-sm font-medium text-stone-700">Orçamento (R$)</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-stone-500 mb-1">Valor mínimo</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-stone-400">R$</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={valorMin}
                    onChange={e => setValorMin(formatBRL(e.target.value))}
                    className="w-full border border-stone-300 rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="0"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-stone-500 mb-1">Valor máximo</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-stone-400">R$</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={valorMax}
                    onChange={e => setValorMax(formatBRL(e.target.value))}
                    className="w-full border border-stone-300 rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
            {form.finalidade === 'compra' && (
              <div className="flex flex-wrap gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.aceita_financiamento} onChange={e => set('aceita_financiamento', e.target.checked)} className="w-4 h-4 accent-emerald-700" />
                  <span className="text-sm text-stone-600">Aceita financiamento</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.aceita_permuta} onChange={e => set('aceita_permuta', e.target.checked)} className="w-4 h-4 accent-emerald-700" />
                  <span className="text-sm text-stone-600">Aceita permuta</span>
                </label>
              </div>
            )}
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
                <span className="text-sm text-stone-500">Encontrar em até</span>
                <select
                  value={prazoValor}
                  onChange={e => setPrazoValor(e.target.value)}
                  className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white w-20"
                >
                  {(prazoUnidade === 'meses'
                    ? Array.from({ length: 12 }, (_, i) => i + 1)
                    : Array.from({ length: 5 }, (_, i) => i + 1)
                  ).map(n => <option key={n} value={n}>{n}</option>)}
                </select>
                <select
                  value={prazoUnidade}
                  onChange={e => { setPrazoUnidade(e.target.value as 'meses' | 'anos'); setPrazoValor('1') }}
                  className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
                >
                  <option value="meses">meses</option>
                  <option value="anos">anos</option>
                </select>
              </div>
            )}
          </div>

          {/* Observações */}
          <div className="bg-white rounded-xl border border-stone-200 p-4">
            <h3 className="text-sm font-medium text-stone-700 mb-2">Observações</h3>
            <textarea
              value={form.observacoes}
              onChange={e => set('observacoes', e.target.value)}
              rows={3}
              className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
              placeholder="Detalhes adicionais sobre a demanda do cliente..."
            />
          </div>

          {/* Submit */}
          <div className="flex gap-3 pb-8">
            <Link href="/demandas" className="flex-1 text-center py-2.5 rounded-lg border border-stone-300 text-sm text-stone-600 hover:bg-stone-50 transition-colors">
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={loading || !estado}
              className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white font-medium py-2.5 rounded-lg text-sm transition-colors disabled:opacity-60"
            >
              {loading ? 'Publicando...' : 'Publicar demanda'}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
