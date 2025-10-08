import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { Call } from '@twilio/voice-sdk';
import { createTwilioDevice, type TwilioDeviceController } from '../lib/twilio';
import { fetchVoiceToken } from '../api';

type TwilioStatus =
  | 'idle'
  | 'registering'
  | 'registered'
  | 'unregistered'
  | 'error'
  | 'in-call';

interface TwilioContextValue {
  status: TwilioStatus;
  identity: string | null;
  activeCall: Call | null;
  incomingCall: Call | null;
  muted: boolean;
  isBusy: boolean;
  error: string | null;
  connect: (identity: string) => Promise<void>;
  disconnect: () => Promise<void>;
  call: (to: string) => Promise<void>;
  hangup: () => void;
  mute: () => void;
  unmute: () => void;
  acceptIncoming: () => void;
  rejectIncoming: () => void;
  clearError: () => void;
}

const TwilioContext = createContext<TwilioContextValue | undefined>(undefined);

const useStableCallback = <Args extends unknown[], Return>(fn: (...args: Args) => Return) => {
  const ref = useRef(fn);
  useEffect(() => {
    ref.current = fn;
  }, [fn]);
  return useCallback((...args: Args) => ref.current(...args), []);
};

export const TwilioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [controller, setController] = useState<TwilioDeviceController | null>(null);
  const [identity, setIdentity] = useState<string | null>(null);
  const [status, setStatus] = useState<TwilioStatus>('idle');
  const [activeCall, setActiveCall] = useState<Call | null>(null);
  const [incomingCall, setIncomingCall] = useState<Call | null>(null);
  const [muted, setMuted] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const detachRef = useRef<(() => void) | null>(null);

  const cleanupController = useCallback(() => {
    detachRef.current?.();
    detachRef.current = null;
    setActiveCall(null);
    setIncomingCall(null);
    setIsBusy(false);
    setMuted(false);
  }, []);

  const attachCall = useStableCallback((call: Call) => {
    let started = false;
    const start = () => {
      if (started) return;
      started = true;
      setIncomingCall(null);
      setActiveCall(call);
      setStatus('in-call');
      setIsBusy(true);
      setMuted(typeof call.isMuted === 'function' ? call.isMuted() : false);
    };

    start();

    call.on('accept', start);
    call.on('mute', () => setMuted(true));
    call.on('unmute', () => setMuted(false));

    const end = () => {
      setActiveCall(null);
      setMuted(false);
      setIsBusy(controller?.isBusy() ?? false);
      const currentState = controller?.getState() ?? 'unregistered';
      setStatus(currentState === 'registered' ? 'registered' : currentState);
    };

    call.on('disconnect', end);
    call.on('cancel', end);
    call.on('reject', end);
    call.on('error', (err) => {
      console.error('[Twilio] Call error', err);
      setError('Error en la llamada');
    });
  });

  const handleIncoming = useStableCallback((call: Call) => {
    setIncomingCall(call);
    call.on('cancel', () => setIncomingCall((current) => (current === call ? null : current)));
    call.on('disconnect', () => setIncomingCall((current) => (current === call ? null : current)));
    call.on('reject', () => setIncomingCall((current) => (current === call ? null : current)));
    call.on('accept', () => attachCall(call));
  });

  const registerDeviceListeners = useCallback((device: TwilioDeviceController) => {
    const disposers = [
      device.onRegistered(() => {
        setStatus('registered');
        setIsBusy(device.isBusy());
      }),
      device.onRegistering(() => {
        setStatus('registering');
      }),
      device.onUnregistered(() => {
        setStatus('unregistered');
        setIncomingCall(null);
        setActiveCall(null);
        setMuted(false);
        setIsBusy(false);
      }),
      device.onIncoming((call) => {
        setStatus('registered');
        handleIncoming(call);
      }),
      device.onError((err) => {
        setError(err.message);
        setStatus('error');
      }),
    ];

    detachRef.current = () => {
      disposers.forEach((dispose) => dispose());
      detachRef.current = null;
    };
  }, [handleIncoming]);

  const connect = useCallback(
    async (agentIdentity: string) => {
      setError(null);
      setIdentity(agentIdentity);
      setStatus('registering');

      if (controller) {
        cleanupController();
        controller.destroy();
        setController(null);
      }

      try {
        const device = await createTwilioDevice(() => fetchVoiceToken(agentIdentity));
        registerDeviceListeners(device);
        setController(device);
        await device.register();
      } catch (err) {
        console.error('[Twilio] Unable to connect device', err);
        setStatus('error');
        setError(err instanceof Error ? err.message : 'No se pudo inicializar el dispositivo');
      }
    },
    [cleanupController, controller, registerDeviceListeners]
  );

  const disconnect = useCallback(async () => {
    if (!controller) return;
    try {
      await controller.unregister();
    } finally {
      controller.destroy();
      cleanupController();
      setController(null);
      setStatus('unregistered');
    }
  }, [cleanupController, controller]);

  const call = useCallback(
    async (to: string) => {
      if (!controller) {
        throw new Error('Dispositivo no inicializado');
      }
      setError(null);
      const sanitized = to.trim();
      if (!sanitized) {
        throw new Error('Número inválido');
      }
      const callInstance = controller.connect({ To: sanitized });
      if (!callInstance) {
        throw new Error('No se pudo iniciar la llamada');
      }
      attachCall(callInstance);
    },
    [attachCall, controller]
  );

  const hangup = useCallback(() => {
    if (activeCall) {
      activeCall.disconnect();
    } else {
      controller?.disconnectAll();
    }
  }, [activeCall, controller]);

  const mute = useCallback(() => {
    if (!activeCall) return;
    activeCall.mute(true);
    setMuted(true);
  }, [activeCall]);

  const unmute = useCallback(() => {
    if (!activeCall) return;
    activeCall.mute(false);
    setMuted(false);
  }, [activeCall]);

  const acceptIncoming = useCallback(() => {
    if (!incomingCall) return;
    incomingCall.accept();
  }, [incomingCall]);

  const rejectIncoming = useCallback(() => {
    if (!incomingCall) return;
    incomingCall.reject();
    setIncomingCall(null);
  }, [incomingCall]);

  const clearError = useCallback(() => setError(null), []);

  useEffect(() => {
    return () => {
      controller?.destroy();
      cleanupController();
    };
  }, [cleanupController, controller]);

  const value = useMemo<TwilioContextValue>(
    () => ({
      status,
      identity,
      activeCall,
      incomingCall,
      muted,
      isBusy,
      error,
      connect,
      disconnect,
      call,
      hangup,
      mute,
      unmute,
      acceptIncoming,
      rejectIncoming,
      clearError,
    }),
    [
      status,
      identity,
      activeCall,
      incomingCall,
      muted,
      isBusy,
      error,
      connect,
      disconnect,
      call,
      hangup,
      mute,
      unmute,
      acceptIncoming,
      rejectIncoming,
      clearError,
    ]
  );

  return <TwilioContext.Provider value={value}>{children}</TwilioContext.Provider>;
};

export const useTwilio = (): TwilioContextValue => {
  const context = useContext(TwilioContext);
  if (!context) {
    throw new Error('useTwilio debe usarse dentro de TwilioProvider');
  }
  return context;
};
