'use client'

import React from 'react'

interface OrderPopupProps {
  orderName: string
  onClose: () => void
}

const OrderPopup: React.FC<OrderPopupProps> = ({ orderName, onClose }) => {
  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      zIndex: 9999,
    }}>
      <div style={{
        background: 'white',
        padding: '24px',
        borderRadius: '12px',
        width: '600px',
        maxHeight: '80vh',
        overflowY: 'auto',
        boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
      }}>
        <h2 style={{ marginBottom: '16px' }}>📦 Gestione ordine {orderName}</h2>
        
        <p>Qui potrai simulare, creare e evadere la spedizione via SpediamoPro.</p>

        {/* In futuro: interfaccia completa per simulazione, creazione, LDV, evasione */}

        <button
          onClick={onClose}
          style={{
            marginTop: '24px',
            padding: '10px 20px',
            backgroundColor: '#007aff',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          Chiudi
        </button>
      </div>
    </div>
  )
}

export default OrderPopup