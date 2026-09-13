'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const TIPO_IMOVEL_OPTIONS = [
  'Apartamento', 'Casa', 'Casa em Condomínio', 'Cobertura',
  'Studio', 'Kitnet', 'Terreno', 'Comercial', 'Galpão', 'Sala Comercial',
]

export default function NovaDemandaPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    finalidade: 'compra',
    tipo_imovel: '',
    cidade: '',
    estado: '',
    bairros: '',
    quartos_min: '',
    quartos_max: '',
    suites_min: '',
    vagas_min: '',
    area_min: '',
    area_max: '',
    valor_min: '',
    valor_max: '',
    aceita_financiamento: false,
    aceita_permuta: false,
    urgencia: 'normal',
    observacoes: '',
  })

  function set(field: string, value: string | boolean) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const payload: Record<string, unknown> = {
      broker_id: user.id,
      finalidade: form.finalidade,
      tipo_imovel: form.tipo_imovel || null,
      cidade: form.cidade || null,
      estado: form.estado || null,
      quartos_min: form.quartos_min ? Number(form.quartos_min) : null,
      quartos_max: form.quartos_max ? Number(form.quartos_max) : null,
      suites_min: form.suites_min ? Number(form.suites_min) : null,
      vagas_min: form.vagas_min ? Number(form.vagas_min) : null,
      area_min: form.area_min ? Number(form.area_min) : null,
      area_max: form.area_max ? Number(form.area_max) : null,
      valor_min: form.valor_min ? Number(form.valor_min.replace(/\D/g, '')) : null,
      valor_max: form.valor_max ? Number(form.valor_max.replace(/\D/g, '')) : null,
      aceita_financiamento: form.aceita_financiamento,
      aceita_permuta: form.aceita_permuta,
      urgencia: form.urgencia,
      observacoes: form.observacoes || null,
      status: 'ativa',
    }

    const { data: demand, error: demandError } = await supabase
      .from('demands')
      .insert(payload)
      .select('id')
      .single()

    if (demandError) {
      setError('Erro ao cadastrar demanda: ' + demandError.message)
      setLoading(false)
      return
    }

    // Insert bairros as demand_locations
    if (form.bairros && demand?.id) {
      const bairroList = form.bairros
        .split(',')
        .map(b => b.trim())
        .filter(Boolean)
        .map(b => ({ demand_id: demand.id, type: 'bairro', value: b }))

      if (bairroList.length > 0) {
        await supabase.from('demand_locations').insert(bairroList)
      }
    }

    router.push('/demandas')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
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

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {/* Finalidade */}
          <div className="bg-white rounded-xl border border-stone-200 p-4">
            <h3 className="text-sm font-medium text-stone-700 mb-3">Finalidade</h3>
            <div className="flex gap-3">
              {['compra', 'aluguel'].map(f => (
                <button
                  key={f}
                  type="button"
                  onClick={() => set('finalidade', f)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    form.finalidade === f
                      ? 'bg-emerald-700 text-white border-emerald-700'
                      : 'bg-white text-stone-600 border-stone-300 hover:border-emerald-400'
                  }`}
                >
                  {f === 'compra' ? 'Compra' : 'Aluguel'}
                </button>
              ))}
            </div>
          </div>

          {/* Tipo de imóvel */}
          <div className="bg-white rounded-xl border border-stone-200 p-4">
            <h3 className="text-sm font-medium text-stone-700 mb-3">Tipo de imóvel</h3>
            <div className="flex flex-wrap gap-2">
              {TIPO_IMOVEL_OPTIONS.map(tipo => (
                <button
                  key={tipo}
                  type="button"
                  onClick={() => set('tipo_imovel', form.tipo_imovel === tipo ? '' : tipo)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    form.tipo_imovel === tipo
                      ? 'bg-emerald-700 text-white border-emerald-700'
                      : 'bg-white text-stone-600 border-stone-300 hover:border-emerald-400'
                  }`}
                >
                  {tipo}
                </button>
              ))}
            </div>
          </div>

          {/* Localização */}
          <div className="bg-white rounded-xl border border-stone-200 p-4 space-y-3">
            <h3 className="text-sm font-medium text-stone-700">Localização</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-stone-500 mb-1">Cidade *</label>
                <input
                  type="text"
                  value={form.cidade}
                  onChange={e => set('cidade', e.target.value)}
                  required
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="São Paulo"
                />
              </div>
              <div>
                <label className="block text-xs text-stone-500 mb-1">Estado</label>
                <input
                  type="text"
                  value={form.estado}
                  onChange={e => set('estado', e.target.value)}
                  maxLength={2}
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="SP"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-stone-500 mb-1">Bairros preferidos</label>
              <input
                type="text"
                value={form.bairros}
                onChange={e => set('bairros', e.target.value)}
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="Pinheiros, Vila Madalena, Jardins (separados por vírgula)"
              />
            </div>
          </div>

          {/* Características */}
          <div className="bg-white rounded-xl border border-stone-200 p-4 space-y-3">
            <h3 className="text-sm font-medium text-stone-700">Características</h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-stone-500 mb-1">Quartos mín.</label>
                <input
                  type="number"
                  min="0"
                  value={form.quartos_min}
                  onChange={e => set('quartos_min', e.target.value)}
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="1"
                />
              </div>
              <div>
                <label className="block text-xs text-stone-500 mb-1">Quartos máx.</label>
                <input
                  type="number"
                  min="0"
                  value={form.quartos_max}
                  onChange={e => set('quartos_max', e.target.value)}
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="4"
                />
              </div>
              <div>
                <label className="block text-xs text-stone-500 mb-1">Suítes mín.</label>
                <input
                  type="number"
                  min="0"
                  value={form.suites_min}
                  onChange={e => set('suites_min', e.target.value)}
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="1"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-stone-500 mb-1">Vagas mín.</label>
                <input
                  type="number"
                  min="0"
                  value={form.vagas_min}
                  onChange={e => set('vagas_min', e.target.value)}
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="1"
                />
              </div>
              <div>
                <label className="block text-xs text-stone-500 mb-1">Área mín. (m²)</label>
                <input
                  type="number"
                  min="0"
                  value={form.area_min}
                  onChange={e => set('area_min', e.target.value)}
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="60"
                />
              </div>
              <div>
                <label className="block text-xs text-stone-500 mb-1">Área máx. (m²)</label>
                <input
                  type="number"
                  min="0"
                  value={form.area_max}
                  onChange={e => set('area_max', e.target.value)}
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="200"
                />
              </div>
            </div>
          </div>

          {/* Orçamento */}
          <div className="bg-white rounded-xl border border-stone-200 p-4 space-y-3">
            <h3 className="text-sm font-medium text-stone-700">Orçamento (R$)</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-stone-500 mb-1">Valor mínimo</label>
                <input
                  type="text"
                  value={form.valor_min}
                  onChange={e => set('valor_min', e.target.value)}
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="500000"
                />
              </div>
              <div>
                <label className="block text-xs text-stone-500 mb-1">Valor máximo</label>
                <input
                  type="text"
                  value={form.valor_max}
                  onChange={e => set('valor_max', e.target.value)}
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="1500000"
                />
              </div>
            </div>

            {form.finalidade === 'compra' && (
              <div className="flex flex-wrap gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.aceita_financiamento}
                    onChange={e => set('aceita_financiamento', e.target.checked)}
                    className="w-4 h-4 accent-emerald-700"
                  />
                  <span className="text-sm text-stone-600">Aceita financiamento</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.aceita_permuta}
                    onChange={e => set('aceita_permuta', e.target.checked)}
                    className="w-4 h-4 accent-emerald-700"
                  />
                  <span className="text-sm text-stone-600">Aceita permuta</span>
                </label>
              </div>
            )}
          </div>

          {/* Urgência */}
          <div className="bg-white rounded-xl border border-stone-200 p-4">
            <h3 className="text-sm font-medium text-stone-700 mb-3">Urgência</h3>
            <div className="flex gap-3">
              {[
                { value: 'baixa', label: 'Baixa', desc: '3+ meses' },
                { value: 'normal', label: 'Normal', desc: '1–3 meses' },
                { value: 'alta', label: 'Alta', desc: '< 1 mês' },
              ].map(u => (
                <button
                  key={u.value}
                  type="button"
                  onClick={() => set('urgencia', u.value)}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm border transition-colors ${
                    form.urgencia === u.value
                      ? 'bg-emerald-700 text-white border-emerald-700'
                      : 'bg-white text-stone-600 border-stone-300 hover:border-emerald-400'
                  }`}
                >
                  <div className="font-medium">{u.label}</div>
                  <div className={`text-xs mt-0.5 ${form.urgencia === u.value ? 'text-emerald-100' : 'text-stone-400'}`}>
                    {u.desc}
                  </div>
                </button>
              ))}
            </div>
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
          <div className="flex gap-3 pb-6">
            <Link
              href="/demandas"
              className="flex-1 text-center py-2.5 rounded-lg border border-stone-300 text-sm text-stone-600 hover:bg-stone-50 transition-colors"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={loading || !form.cidade}
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
