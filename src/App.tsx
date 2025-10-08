import React, { useEffect, useMemo, useState } from 'react';
import './App.css';
import { useTwilio } from './context/TwilioContext';
import CallControls from './components/CallControls';
import IncomingToast from './components/IncomingToast';
import Toast from './components/Toast';

const statusLabels: Record<string, string> = {
  idle: 'Sin conectar',
  registering: 'Registrando…',
  registered: 'Registrado',
  'in-call': 'En llamada',
  unregistered: 'Desconectado',
  error: 'Error',
};

const getIncomingCaller = (incomingCall: ReturnType<typeof useTwilio>['incomingCall']) => {
  if (!incomingCall) return '';
  const params = incomingCall.parameters as unknown;
  if (params && typeof params === 'object') {
    if (typeof (params as { get?: (key: string) => string | undefined }).get === 'function') {
      return (params as { get: (key: string) => string | undefined }).get('From') ?? '';
    }
    if ('From' in (params as Record<string, unknown>)) {
      const value = (params as Record<string, unknown>).From;
      return typeof value === 'string' ? value : '';
    }
  }
  return '';
};

const App: React.FC = () => {
  const {
    status,
    identity,
    connect,
    disconnect,
    incomingCall,
    acceptIncoming,
    rejectIncoming,
    error,
    clearError,
  } = useTwilio();
  const [identityInput, setIdentityInput] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [pwaUpdate, setPwaUpdate] = useState<(() => Promise<void>) | null>(null);
  const [offlineReady, setOfflineReady] = useState(false);

  const handleConnect = async () => {
    if (!identityInput.trim()) return;
    setConnecting(true);
    try {
      await connect(identityInput.trim());
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setConnecting(true);
    try {
      await disconnect();
    } finally {
      setConnecting(false);
    }
  };

  useEffect(() => {
    const refreshHandler = (event: CustomEvent<() => Promise<void>>) => {
      setPwaUpdate(() => event.detail);
    };
    const offlineHandler = () => setOfflineReady(true);

    window.addEventListener('pwa:need-refresh', refreshHandler as EventListener);
    window.addEventListener('pwa:offline-ready', offlineHandler);

    return () => {
      window.removeEventListener('pwa:need-refresh', refreshHandler as EventListener);
      window.removeEventListener('pwa:offline-ready', offlineHandler);
    };
  }, []);

  const statusLabel = useMemo(() => statusLabels[status] ?? status, [status]);
  const caller = useMemo(() => getIncomingCaller(incomingCall), [incomingCall]);

  return (
    <div className="app-shell">
      <header>
        <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 700 }}>Alliance Voice Softphone</h1>
        <p className="helper-text">
          Conéctate con tu identidad de agente para recibir y realizar llamadas vía Twilio Voice.
        </p>
      </header>

      <section className="card">
        <form
          className="identity-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (status === 'registered' || status === 'in-call') {
              handleDisconnect();
            } else {
              handleConnect();
            }
          }}
        >
          <input
            value={identityInput}
            onChange={(event) => setIdentityInput(event.target.value)}
            placeholder="Identity (agente)"
            autoComplete="off"
          />
          <button
            type="submit"
            className="primary-button"
            disabled={connecting || (!identityInput && status !== 'registered' && status !== 'in-call')}
          >
            {status === 'registered' || status === 'in-call' ? 'Desconectar' : 'Conectar'}
          </button>
          {identity && (
            <span className="helper-text">Conectado como: <strong>{identity}</strong> · {statusLabel}</span>
          )}
        </form>
      </section>

      <CallControls />

      <IncomingToast
        visible={Boolean(incomingCall)}
        caller={caller}
        onAccept={acceptIncoming}
        onReject={rejectIncoming}
      />

      <div className="toast-stack">
        {error && (
          <Toast
            message={error}
            onClose={clearError}
          />
        )}
        {pwaUpdate && (
          <Toast
            message="Nueva versión disponible"
            actionLabel="Actualizar"
            onAction={() => {
              pwaUpdate()
                .then(() => setPwaUpdate(null))
                .catch((err) => {
                  console.error('[PWA] Error al actualizar el Service Worker', err);
                  setPwaUpdate(null);
                });
            }}
            onClose={() => setPwaUpdate(null)}
          />
        )}
        {offlineReady && !pwaUpdate && (
          <Toast
            message="La app está lista para funcionar offline"
            onClose={() => setOfflineReady(false)}
          />
        )}
      </div>
    </div>
  );
};

export default App;
