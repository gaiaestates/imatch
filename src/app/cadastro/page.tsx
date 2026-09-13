'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function CadastroPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [creci, setCreci] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirmEmail, setConfirmEmail] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleCadastro(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    // Se não há sessão, Supabase exige confirmação de email
    if (!data.session) {
      setConfirmEmail(true)
      setLoading(false)
      return
    }

    // Sessão ativa (confirmação desabilitada) — atualiza perfil e redireciona
    if (data.user) {
      if (creci || phone) {
        await supabase.from('profiles').update({ creci, phone }).eq('id', data.user.id)
      }
    }

    router.push('/demandas')
    router.refresh()
  }

  if (confirmEmail) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
        <div className="w-full max-w-sm text-center">
          <div className="text-5xl mb-4">📧</div>
          <h1 className="text-3xl font-serif font-medium text-emerald-800 mb-2">
            i<em className="font-light text-stone-400 not-italic">Match</em>
          </h1>
          <h2 className="text-lg font-medium text-stone-800 mb-2">Confirme seu email</h2>
          <p className="text-sm text-stone-500 mb-6">
            Enviamos um link de confirmação para <strong className="text-stone-700">{email}</strong>.
            Clique no link para ativar sua conta.
          </p>
          <p className="text-xs text-stone-400">
            Não recebeu?{' '}
            <button
              onClick={() => setConfirmEmail(false)}
              className="text-emerald-700 hover:underline"
            >
              Tentar novamente
            </button>
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-stone-50 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-serif font-medium text-emerald-800">
            i<em className="font-light text-stone-400 not-italic">Match</em>
          </h1>
          <p className="text-stone-500 mt-1 text-sm">Plataforma de demandas imobiliárias</p>
        </div>

        <form onSubmit={handleCadastro} className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 space-y-4">
          <h2 className="text-lg font-medium text-stone-800">Criar conta</h2>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Nome completo</label>
            <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} required
              className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="João Silva" />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="seu@email.com" />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Senha</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6}
              className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="mínimo 6 caracteres" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                CRECI <span className="text-stone-400 font-normal">(opcional)</span>
              </label>
              <input type="text" value={creci} onChange={e => setCreci(e.target.value)}
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="12345-F" />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                WhatsApp <span className="text-stone-400 font-normal">(opcional)</span>
              </label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="(11) 99999-9999" />
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-medium py-2.5 rounded-lg text-sm transition-colors disabled:opacity-60">
            {loading ? 'Criando conta...' : 'Criar conta'}
          </button>
        </form>

        <p className="text-center text-sm text-stone-500 mt-4">
          Já tem conta?{' '}
          <Link href="/login" className="text-emerald-700 font-medium hover:underline">Entrar</Link>
        </p>
      </div>
    </main>
  )
}
