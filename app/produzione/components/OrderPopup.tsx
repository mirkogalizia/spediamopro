'use client'

import React, { useEffect, useState } from 'react'

interface OrderPopupProps {
  orderName: string
  onClose: () => void
  onEvadi: () => void
}

const OrderPopup: React.FC<OrderPopupProps> = ({ orderName, onClose, onEvadi }) => {
  const [address, setAddress] = useState<string>('')
  const [ldv, setLdv] = useState<string>('')

  // Recupera l'indirizzo al mount
  useEffect(() => {
    fetch(`/api/spediamo?step=address&id=${orderName}`)
      .then(res => res.json())
      .then(data => setAddress(data.address || 'N/A'))
  }, [orderName])

  const handleSimula = async () => {
    const res = await fetch(`/api/spediamo?step=simulate&id=${orderName}`)
    const data = await res.json()
    if (data.success) alert('Simulazione completata')
  }

  const handleCreaSpedizione = async () => {
    const res = await fetch(`/api/spediamo?step=create&id=${orderName}`)
    const data = await res.json()
    if (data.success) alert('Spedizione creata con successo')
  }

  const handlePaga = async () => {
    const res = await fetch(`/api/spediamo?step=pay&id=${orderName}`)
    const data = await res.json()
    if (data.success && data.ldv) {
      setLdv(data.ldv)
      alert('Pagamento completato')
    }
  }

  const handleEvadi = async () => {
    const res = await fetch(`/api/spediamo?step=evadi&shopifyOrderId=${orderName}`)
    const data = await res.json()
    if (data.success) {
      onEvadi() // ✅ Notifica al parent che l'ordine è evaso
      onClose() // Chiudi popup
    }
  }

  return (
    <div style={{
      position: 'fixed',
      top: '10%',
      left: '50%',
      transform: 'translateX(-50%)',
      backgroundColor: 'white',
      border: '2px solid black',
      padding: '30px',
      zIndex: 9999,
      width: '500px',
      boxShadow: '0 10px 20px rgba(0,0,0,0.3)',
      borderRadius: '12px'
    }}>
      <h2>Gestione Spedizione Ordine: {orderName}</h2>
      <p><strong>Indirizzo:</strong><br />{address}</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
        <button onClick={handleSimula}>🔍 Simula</button>
        <button onClick={handleCreaSpedizione}>📦 Crea Spedizione</button>
        <button onClick={handlePaga}>💳 Paga e Stampa LDV</button>
        {ldv && <a href={ldv} target="_blank" rel="noopener noreferrer">📄 Visualizza LDV</a>}
        <button onClick={handleEvadi} style={{ backgroundColor: 'black', color: 'white', marginTop: '10px' }}>
          ✅ Evadi Ordine
        </button>
        <button onClick={onClose} style={{ marginTop: '10px' }}>❌ Chiudi</button>
      </div>
    </div>
  )
}

export default OrderPopup