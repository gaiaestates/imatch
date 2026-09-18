import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export type CreciStatus = 'ativo' | 'inativo' | 'nao_encontrado' | 'erro' | 'pendente'

async function consultarCofeci(creci: string): Promise<CreciStatus> {
  try {
    // Remove caracteres extras e pega só o número
    const numero = creci.replace(/[^0-9]/g, '')
    if (!numero) return 'nao_encontrado'

    const res = await fetch(
      `https://www.cofeci.gov.br/portal/pesquisa-corretor?creci=${encodeURIComponent(creci)}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml',
        },
        signal: AbortSignal.timeout(8000),
      }
    )

    if (!res.ok) return 'erro'

    const html = await res.text()
    const lower = html.toLowerCase()

    if (lower.includes('não encontrado') || lower.includes('nao encontrado') || lower.includes('no results')) {
      return 'nao_encontrado'
    }
    if (lower.includes('ativo') || lower.includes('regular')) {
      return 'ativo'
    }
    if (lower.includes('inativo') || lower.includes('suspenso') || lower.includes('cancelado') || lower.includes('cassado')) {
      return 'inativo'
    }

    return 'erro'
  } catch {
    return 'erro'
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { userId, creci } = await req.json()

  // Só admin pode verificar outros usuários
  const targetId = userId ?? user.id
  if (targetId !== user.id) {
    const { data: myProfile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
    if (!(myProfile as any)?.is_admin) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
    }
  }

  if (!creci) return NextResponse.json({ error: 'CRECI não informado' }, { status: 400 })

  const status = await consultarCofeci(creci)

  await supabase.from('profiles').update({
    creci_status: status,
    creci_verificado_em: new Date().toISOString(),
  }).eq('id', targetId)

  return NextResponse.json({ status })
}

// Admin pode forçar um status manualmente
export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: myProfile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!(myProfile as any)?.is_admin) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  const { userId, status } = await req.json()
  if (!userId || !status) return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 })

  await supabase.from('profiles').update({
    creci_status: status,
    creci_verificado_em: new Date().toISOString(),
  }).eq('id', userId)

  return NextResponse.json({ status })
}
