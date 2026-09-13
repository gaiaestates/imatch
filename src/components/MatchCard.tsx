'use client'

import { useState } from 'react'

interface CriterionResult {
  criterion: string
  status: 'confirmed' | 'not_found' | 'failed' | 'not_applicable'
  weight: number
  earned: number
  max: number
  detail?: string
}

interface ScoreDetails {
  total: number
  breakdown: CriterionResult[]
  confirmed_count: number
  not_found_count: number
  failed_count: number
}

interface ScrapedProperty {
  portal: string
  url: string
  title?: string
  tipo_imovel?: string
  cidade?: string
  bairro?: string
  area_util?: number
  quartos?: number
  suites?: number
  vagas?: number
  valor?: number
  cond_valor?: number
  amenidades?: string[]
  imagens?: string[]
}

interface Match {
  id: string
  score: number
  score_details: ScoreDetails
  status: string
  matched_at: string
  scraped_properties: ScrapedProperty
}

const PORTAL_LABELS: Record<string, string> = {
  zap: 'ZAP Imóveis',
  imovelweb: 'ImovelWeb',
  pilar: 'Pilar',
  jardins: 'Jardins & Co',
  axpe: 'Axpe',
}

const STATUS_ICONS: Record<string, string> = {
  confirmed: '✅',
  not_found: '❓',
  failed: '❌',
  not_applicable: '—',
}

function scoreColor(score: number) {
  if (score >= 80) return 'bg-emerald-600 text-white'
  if (score >= 60) return 'bg-amber-500 text-white'
  if (score >= 40) return 'bg-orange-500 text-white'
  return 'bg-red-500 text-white'
}

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 })
}

export default function MatchCard({ match }: { match: Match }) {
  const [expanded, setExpanded] = useState(false)
  const prop = match.scraped_properties
  const details = match.score_details

  const relevantBreakdown = details?.breakdown?.filter(
    (c) => c.status !== 'not_applicable'
  ) ?? []

  return (
    <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
      {/* Linha principal */}
      <div className="flex items-center gap-4 p-4">
        {/* Score badge */}
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold shrink-0 ${scoreColor(match.score)}`}>
          {Math.round(match.score)}
        </div>

        {/* Info do imóvel */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full font-medium">
              {PORTAL_LABELS[prop.portal] ?? prop.portal}
            </span>
            {prop.tipo_imovel && (
              <span className="text-xs text-stone-400">{prop.tipo_imovel}</span>
            )}
          </div>
          <p className="text-sm font-medium text-stone-800 mt-0.5 truncate">
            {prop.title ?? 'Imóvel sem título'}
          </p>
          <p className="text-xs text-stone-400 mt-0.5">
            {[prop.bairro, prop.cidade].filter(Boolean).join(', ')}
            {prop.area_util ? ` · ${prop.area_util} m²` : ''}
            {prop.quartos ? ` · ${prop.quartos} qtos` : ''}
            {prop.vagas ? ` · ${prop.vagas} vaga${prop.vagas !== 1 ? 's' : ''}` : ''}
          </p>
        </div>

        {/* Valor + ações */}
        <div className="shrink-0 text-right">
          {prop.valor && (
            <p className="text-sm font-semibold text-stone-800">{formatBRL(prop.valor)}</p>
          )}
          {prop.cond_valor && (
            <p className="text-xs text-stone-400">Cond: {formatBRL(prop.cond_valor)}</p>
          )}
          <div className="flex items-center gap-2 mt-2 justify-end">
            <a
              href={prop.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-emerald-700 hover:text-emerald-900 font-medium"
            >
              Ver anúncio ↗
            </a>
            {relevantBreakdown.length > 0 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-xs text-stone-400 hover:text-stone-700"
              >
                {expanded ? '▲' : '▼'} detalhes
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Score summary chips */}
      <div className="px-4 pb-3 flex items-center gap-3 text-xs text-stone-500 border-t border-stone-50 pt-2">
        {details && (
          <>
            <span>✅ {details.confirmed_count ?? 0} confirmado{details.confirmed_count !== 1 ? 's' : ''}</span>
            <span>❓ {details.not_found_count ?? 0} não constatado{details.not_found_count !== 1 ? 's' : ''}</span>
            <span>❌ {details.failed_count ?? 0} falhou</span>
          </>
        )}
      </div>

      {/* Breakdown expandido */}
      {expanded && relevantBreakdown.length > 0 && (
        <div className="border-t border-stone-100 px-4 py-3 space-y-1.5">
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">Critérios avaliados</p>
          {relevantBreakdown.map((c, i) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              <span className="mt-0.5 shrink-0">{STATUS_ICONS[c.status] ?? '·'}</span>
              <span className={`flex-1 ${c.status === 'failed' ? 'text-red-600' : c.status === 'not_found' ? 'text-stone-400' : 'text-stone-700'}`}>
                <span className="font-medium">{c.criterion}</span>
                {c.detail ? ` — ${c.detail}` : ''}
              </span>
              <span className="text-stone-300 shrink-0 tabular-nums">
                {c.earned.toFixed(0)}/{c.max.toFixed(0)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
