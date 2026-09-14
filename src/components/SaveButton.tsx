'use client'

import { useState } from 'react'

export default function SaveButton({
  demandId,
  isSaved: initial,
  size = 'sm',
}: {
  demandId: string
  isSaved: boolean
  size?: 'sm' | 'md'
}) {
  const [saved, setSaved] = useState(initial)
  const [loading, setLoading] = useState(false)

  async function toggle(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setLoading(true)
    try {
      await fetch(`/api/save/${demandId}`, { method: saved ? 'DELETE' : 'POST' })
      setSaved(!saved)
    } finally {
      setLoading(false)
    }
  }

  const base = size === 'md'
    ? 'w-9 h-9 text-lg rounded-xl'
    : 'w-7 h-7 text-sm rounded-lg'

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={saved ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
      className={`${base} flex items-center justify-center transition-all shrink-0 ${
        loading ? 'opacity-40' : ''
      } ${
        saved
          ? 'bg-red-50 text-red-500 hover:bg-red-100'
          : 'bg-stone-100 text-stone-400 hover:bg-stone-200 hover:text-stone-600'
      }`}
    >
      {saved ? '❤️' : '🤍'}
    </button>
  )
}
