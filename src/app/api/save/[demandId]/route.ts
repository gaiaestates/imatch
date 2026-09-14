import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ demandId: string }> }
) {
  const { demandId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await supabase
    .from('saved_demands')
    .upsert({ broker_id: user.id, demand_id: demandId }, { onConflict: 'broker_id,demand_id', ignoreDuplicates: true })

  return NextResponse.json({ ok: true, saved: true })
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ demandId: string }> }
) {
  const { demandId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await supabase
    .from('saved_demands')
    .delete()
    .eq('broker_id', user.id)
    .eq('demand_id', demandId)

  return NextResponse.json({ ok: true, saved: false })
}
