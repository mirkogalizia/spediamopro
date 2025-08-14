'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

function removeAccents(str: string) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

export default function OrderPopup({
  orderName,
  onClose,
  onEvadi,
}: {
  orderName: string
  onClose: () => void
  onEvadi: () => void
}) {
  const [indirizzo, setIndirizzo] = useState('')
  const [corrieri, setCorrieri] = useState([])
  const [selectedCorriere, setSelectedCorriere] = useState('')
  const [ldv, setLdv] = useState('')
  const [idSpedizione, setIdSpedizione] = useState('')
  const [loading, setLoading] = useState(false)

  const cercaIndirizzo = async () => {
    setLoading(true)
    const res = await fetch(`/api/shopify/indirizzo?orderName=${orderName}`)
    const json = await res.json()
    if (json && json.indirizzo) setIndirizzo(json.indirizzo)
    setLoading(false)
  }

  const simulaSpedizione = async () => {
    setLoading(true)
    const res = await fetch(`/api/spediamo?step=simula&shopifyOrderId=${orderName}`)
    const json = await res.json()
    if (json?.corrieri) setCorrieri(json.corrieri)
    setLoading(false)
  }

  const creaSpedizione = async () => {
    if (!selectedCorriere) return
    setLoading(true)
    const res = await fetch(
      `/api/spediamo?step=create&shopifyOrderId=${orderName}&corriere=${removeAccents(selectedCorriere)}`
    )
    const json = await res.json()
    if (json?.id) {
      setIdSpedizione(json.id)
      await pagaSpedizione(json.id)
    }
    setLoading(false)
  }

  const pagaSpedizione = async (id: string) => {
    setLoading(true)
    const res = await fetch(`/api/spediamo?step=pay&id=${id}`)
    const json = await res.json()
    if (json?.ldv) setLdv(json.ldv)
    setLoading(false)
  }

  const evadiOrdine = async () => {
    if (!idSpedizione || !ldv) return
    setLoading(true)
    await fetch(`/api/shopify/evadi?orderName=${orderName}&trackingUrl=${ldv}`)
    onEvadi()
    setLoading(false)
  }

  useEffect(() => {
    cercaIndirizzo()
  }, [orderName])

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-xl relative">
        <button onClick={onClose} className="absolute top-3 right-4 text-lg">×</button>
        <h2 className="text-xl font-bold mb-2">Gestione ordine <span className="text-blue-600">{orderName}</span></h2>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="animate-spin w-6 h-6" />
          </div>
        ) : (
          <>
            {indirizzo && (
              <div className="mb-4 text-sm border p-3 rounded">
                <strong>Indirizzo:</strong><br />{indirizzo}
              </div>
            )}

            {corrieri.length === 0 && (
              <Button onClick={simulaSpedizione} className="w-full mb-3">Simula spedizione</Button>
            )}

            {corrieri.length > 0 && !idSpedizione && (
              <>
                <select
                  value={selectedCorriere}
                  onChange={(e) => setSelectedCorriere(e.target.value)}
                  className="w-full p-2 border rounded mb-3"
                >
                  <option value="">Seleziona corriere</option>
                  {corrieri.map((c: string) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <Button onClick={creaSpedizione} className="w-full">Crea e paga spedizione</Button>
              </>
            )}

            {ldv && (
              <div className="mt-4 space-y-2">
                <a href={ldv} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline block">
                  📦 Stampa Lettera di Vettura
                </a>
                <Button onClick={evadiOrdine} className="w-full bg-green-600 hover:bg-green-700">
                  ✅ Evadi ordine
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}