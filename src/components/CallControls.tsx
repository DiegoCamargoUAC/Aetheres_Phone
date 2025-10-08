import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useTwilio } from '../context/TwilioContext';

const statusColor: Record<string, string> = {
  idle: '#94a3b8',
  registering: '#facc15',
  registered: '#22c55e',
  'in-call': '#f97316',
  unregistered: '#94a3b8',
  error: '#ef4444',
};

export const CallControls: React.FC = () => {
  const { status, call, hangup, mute, unmute, muted, isBusy, activeCall } = useTwilio();
  const [dialValue, setDialValue] = useState('');
  const [dialing, setDialing] = useState(false);

  const handleCall = async () => {
    if (!dialValue) return;
    setDialing(true);
    try {
      await call(dialValue);
    } catch (error) {
      console.error('[UI] Error iniciando llamada', error);
    } finally {
      setDialing(false);
    }
  };

  const handleHangup = () => {
    hangup();
  };

  const handleToggleMute = () => {
    if (muted) {
      unmute();
    } else {
      mute();
    }
  };

  const color = statusColor[status] ?? '#94a3b8';

  return (
    <div className="card">
      <h2 className="section-title">Controles de llamada</h2>
      <div className="helper-text">Estado del dispositivo: <span className="status-pill"><span style={{ backgroundColor: color }} />{status}</span></div>
      <div className="helper-text">Ocupado: {isBusy ? 'Sí' : 'No'}</div>
      <div className="helper-text">Llamada activa: {activeCall ? 'Sí' : 'No'}</div>

      <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <input
          type="tel"
          placeholder="Número a marcar"
          value={dialValue}
          onChange={(event) => setDialValue(event.target.value)}
          disabled={status !== 'registered' && status !== 'in-call'}
          style={{
            padding: '0.75rem 1rem',
            borderRadius: '0.75rem',
            border: '1px solid #cbd5f5',
            background: '#fff',
            fontSize: '1.05rem',
          }}
        />

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <motion.button
            type="button"
            className="primary-button"
            style={{ flex: '1 1 160px' }}
            whileHover={{ scale: status === 'registered' && !dialing ? 1.02 : 1 }}
            whileTap={{ scale: status === 'registered' && !dialing ? 0.98 : 1 }}
            disabled={status !== 'registered' || dialing}
            onClick={handleCall}
          >
            {dialing ? 'Marcando…' : 'Llamar'}
          </motion.button>

          <motion.button
            type="button"
            style={{
              flex: '1 1 160px',
              background: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '0.75rem',
              fontWeight: 600,
              padding: '0.75rem 1rem',
            }}
            whileHover={{ scale: activeCall ? 1.02 : 1 }}
            whileTap={{ scale: activeCall ? 0.96 : 1 }}
            disabled={!activeCall}
            onClick={handleHangup}
          >
            Colgar
          </motion.button>

          <motion.button
            type="button"
            style={{
              flex: '1 1 160px',
              background: '#0f172a',
              color: 'white',
              border: 'none',
              borderRadius: '0.75rem',
              fontWeight: 600,
              padding: '0.75rem 1rem',
            }}
            whileHover={{ scale: activeCall ? 1.02 : 1 }}
            whileTap={{ scale: activeCall ? 0.96 : 1 }}
            disabled={!activeCall}
            onClick={handleToggleMute}
          >
            {muted ? 'Unmute' : 'Mute'}
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default CallControls;
