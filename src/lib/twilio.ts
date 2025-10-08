import { Device } from '@twilio/voice-sdk';
import type { Call, DeviceOptions } from '@twilio/voice-sdk';

type DeviceStatus = 'unregistered' | 'registering' | 'registered';

type IncomingListener = (call: Call) => void;
type VoidListener = () => void;
type ErrorListener = (error: Error) => void;

type ListenerMap = {
  incoming: Set<IncomingListener>;
  registered: Set<VoidListener>;
  registering: Set<VoidListener>;
  unregistered: Set<VoidListener>;
  error: Set<ErrorListener>;
};

export interface TwilioDeviceController {
  readonly device: Device;
  register: () => Promise<void>;
  unregister: () => Promise<void>;
  connect: (params?: Record<string, string>) => Call | undefined;
  disconnectAll: () => void;
  getState: () => DeviceStatus;
  isBusy: () => boolean;
  onIncoming: (listener: IncomingListener) => () => void;
  onRegistered: (listener: VoidListener) => () => void;
  onRegistering: (listener: VoidListener) => () => void;
  onUnregistered: (listener: VoidListener) => () => void;
  onError: (listener: ErrorListener) => () => void;
  destroy: () => void;
}

const createListenerMap = (): ListenerMap => ({
  incoming: new Set(),
  registered: new Set(),
  registering: new Set(),
  unregistered: new Set(),
  error: new Set(),
});

const notify = <T>(listeners: Set<(payload: T) => void>, payload: T) => {
  listeners.forEach((listener) => listener(payload));
};

const notifyVoid = (listeners: Set<VoidListener>) => {
  listeners.forEach((listener) => listener());
};

export async function createTwilioDevice(
  getToken: () => Promise<string>,
  options?: DeviceOptions
): Promise<TwilioDeviceController> {
  const token = await getToken();
  const device = new Device(token, {
    logLevel: 'error',
    codecPreferences: ['opus', 'pcmu'],
    ...options,
  });

  const listeners = createListenerMap();

  device.on('registered', () => {
    notifyVoid(listeners.registered);
  });

  device.on('registering', () => {
    notifyVoid(listeners.registering);
  });

  device.on('unregistered', () => {
    notifyVoid(listeners.unregistered);
  });

  device.on('incoming', (call: Call) => {
    notify(listeners.incoming, call);
  });

  device.on('tokenWillExpire', async () => {
    try {
      const newToken = await getToken();
      await device.updateToken(newToken);
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Token refresh failed');
      console.error('[Twilio] Error refreshing token', err);
      notify(listeners.error, err);
    }
  });

  device.on('error', (error) => {
    const err = error instanceof Error ? error : new Error((error as { message?: string }).message ?? 'Twilio device error');
    console.error('[Twilio] Device error', error);
    notify(listeners.error, err);
  });

  const register = async () => {
    await device.register();
  };

  const unregister = async () => {
    await device.unregister();
  };

  const connect = (params?: Record<string, string>) => {
    if (!params) {
      return device.connect();
    }

    return device.connect({ params });
  };

  const disconnectAll = () => {
    device.disconnectAll();
  };

  const getState = (): DeviceStatus => {
    const state = device.state();
    if (state === 'registered' || state === 'registering' || state === 'unregistered') {
      return state;
    }
    return 'unregistered';
  };

  const isBusy = () => {
    try {
      return device.isBusy();
    } catch (error) {
      return false;
    }
  };

  const registerListener = <T extends keyof ListenerMap>(
    type: T,
    listener: ListenerMap[T] extends Set<infer K> ? K : never
  ) => {
    const set = listeners[type] as Set<typeof listener>;
    set.add(listener as never);
    return () => set.delete(listener as never);
  };

  const destroy = () => {
    device.destroy();
    (Object.keys(listeners) as Array<keyof ListenerMap>).forEach((key) => {
      listeners[key].clear();
    });
  };

  return {
    device,
    register,
    unregister,
    connect,
    disconnectAll,
    getState,
    isBusy,
    onIncoming: (listener) => registerListener('incoming', listener),
    onRegistered: (listener) => registerListener('registered', listener),
    onRegistering: (listener) => registerListener('registering', listener),
    onUnregistered: (listener) => registerListener('unregistered', listener),
    onError: (listener) => registerListener('error', listener),
    destroy,
  };
}
