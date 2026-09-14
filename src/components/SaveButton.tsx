'use client'

import { useState } from 'react'

export default function SaveButton({
  demandId,
  isSaved: initial,
}: {
  demandId: string
  isSaved: boolean
}) {
  const [saved, setSaved] = useState(initial)
  const [loading, setLoading] = useState(false)

  async function toggle(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setLoading(true)
    try {
      await fetch(`/api/save/${demandId}`, {
        method: saved ? 'DELETE' : 'POST',
      })
      setSaved(!saved)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={saved ? 'Remover dos salvos' : 'Salvar demanda'}
      className={`shrink-0 w-7 h-7 flex items-center justify-center rounded-full transition-colors ${
        saved
          ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
          : 'bg-stone-100 text-stone-400 hover:bg-stone-200 hover:text-stone-600'
      } ${loading ? 'opacity-50' : ''}`}
    >
      {saved ? '🔖' : '📌'}
    </button>
  )
}
