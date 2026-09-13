// ================================================================
// API Route — POST /api/match/[demandId]
// Dispara um job de matching para uma demanda
// ================================================================

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runMatchJob } from '@/lib/matching/runner'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ demandId: string }> }
) {
  const { demandId } = await params

  // Verifica autenticação
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verifica se a demanda pertence ao usuário
  const { data: demand } = await supabase
    .from('demands')
    .select('id, broker_id')
    .eq('id', demandId)
    .single()

  if (!demand || demand.broker_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    // Roda o job de matching (pode demorar — ideal mover para background)
    const result = await runMatchJob(demandId)
    return NextResponse.json({ ok: true, ...result })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// GET — retorna matches existentes para uma demanda
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ demandId: string }> }
) {
  const { demandId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: matches } = await supabase
    .from('demand_matches')
    .select(`
      id, score, score_details, status, matched_at,
      scraped_properties(
        portal, url, title, tipo_imovel, cidade, bairro,
        area_util, quartos, suites, vagas, valor, cond_valor,
        amenidades, imagens
      )
    `)
    .eq('demand_id', demandId)
    .order('score', { ascending: false })
    .limit(50)

  return NextResponse.json({ matches: matches ?? [] })
}
