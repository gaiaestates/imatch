'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AvatarUpload from '@/components/AvatarUpload'

export default function PerfilPage() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [userId, setUserId] = useState('')
  const [fullName, setFullName] = useState('')
  const [creci, setCreci] = useState('')
  const [phone, setPhone] = useState('')
  const [instagram, setInstagram] = useState('')
  const [linkedin, setLinkedin] = useState('')
  const [bio, setBio] = useState('')
  const [imobiliaria, setImobiliaria] = useState('')
  const [autonomo, setAutonomo] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [saved, setSavedMsg] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)
      setEmail(user.email ?? '')
      const { data } = await supabase.from('profiles')
        .select('full_name, creci, phone, instagram, linkedin, bio, imobiliaria, autonomo, avatar_url')
        .eq('id', user.id).single()
      if (data) {
        setFullName(data.full_name ?? '')
        setCreci(data.creci ?? '')
        setPhone(data.phone ?? '')
        setInstagram(data.instagram ?? '')
        setLinkedin(data.linkedin ?? '')
        setBio(data.bio ?? '')
        setImobiliaria(data.imobiliaria ?? '')
        setAutonomo(data.autonomo ?? false)
        setAvatarUrl(data.avatar_url ?? null)
      }
      setLoading(false)
    }
    load()
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await supabase.from('profiles')
      .update({ full_name: fullName, creci, phone, instagram, linkedin, bio, imobiliaria, autonomo })
      .eq('id', userId)
    setSaving(false)
    setSavedMsg(true)
    setTimeout(() => setSavedMsg(false), 2500)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-stone-400 text-sm">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-stone-800">Meu perfil</h1>
          <p className="text-sm text-stone-400 mt-0.5">{email}</p>
        </div>
        <Link href={`/corretores/${userId}`}
          className="text-sm text-emerald-700 hover:underline border border-emerald-200 px-3 py-1.5 rounded-lg hover:bg-emerald-50 transition-colors">
          Ver meu perfil público →
        </Link>
      </div>

      {/* Avatar */}
      <div className="bg-white rounded-xl border border-stone-200 p-6 flex flex-col items-center mb-4">
        <p className="text-sm font-medium text-stone-700 mb-4">Foto de perfil</p>
        {userId && (
          <AvatarUpload
            userId={userId}
            currentUrl={avatarUrl}
            userName={fullName}
            size="lg"
          />
        )}
        <p className="text-xs text-stone-400 mt-3">JPG, PNG ou WebP · máximo 5 MB</p>
      </div>

      <form onSubmit={handleSave} className="bg-white rounded-xl border border-stone-200 p-6 space-y-4">

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Nome completo</label>
          <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} required
            className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>

        {/* Imobiliária / Autônomo */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-stone-700">Imobiliária</label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={autonomo} onChange={e => setAutonomo(e.target.checked)}
                className="w-4 h-4 accent-emerald-600 rounded" />
              <span className="text-sm text-stone-600">Sou autônomo</span>
            </label>
          </div>
          <input type="text" value={imobiliaria} onChange={e => setImobiliaria(e.target.value)}
            disabled={autonomo}
            required={!autonomo}
            placeholder={autonomo ? 'Autônomo' : 'Nome da imobiliária'}
            className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-stone-50 disabled:text-stone-400" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">CRECI</label>
            <input type="text" value={creci} onChange={e => setCreci(e.target.value)}
              placeholder="12345-F"
              className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              WhatsApp <span className="text-red-500">*</span>
            </label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} required
              placeholder="(11) 99999-9999"
              className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Instagram</label>
            <input type="text" value={instagram} onChange={e => setInstagram(e.target.value)}
              placeholder="@seuinstagram"
              className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">LinkedIn</label>
            <input type="text" value={linkedin} onChange={e => setLinkedin(e.target.value)}
              placeholder="linkedin.com/in/usuario"
              className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">
            Bio <span className="text-stone-400 font-normal">(opcional)</span>
          </label>
          <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3}
            placeholder="Uma linha sobre você e sua especialidade..."
            className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
        </div>

        <div className="flex items-center justify-between pt-2">
          {saved && (
            <span className="text-sm text-emerald-600 font-medium">✓ Perfil salvo!</span>
          )}
          <button type="submit" disabled={saving}
            className="ml-auto bg-emerald-700 hover:bg-emerald-800 text-white font-medium py-2.5 px-6 rounded-lg text-sm transition-colors disabled:opacity-60">
            {saving ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </div>
      </form>
    </div>
  )
}
