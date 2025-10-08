# Alliance Voice PWA

Softphone progresivo construido con Vite + React + TypeScript y Twilio Voice SDK.

## Puesta en marcha

```bash
npm create vite@latest alliance-voice-pwa -- --template react-ts
cd alliance-voice-pwa
npm i @twilio/voice-sdk framer-motion
npm i -D vite-plugin-pwa
```

Configura las variables de entorno creando un archivo `.env` con:

```
VITE_API_BASE="https://mi-backend.example.com"
```

Instala dependencias y levanta el entorno de desarrollo:

```bash
npm install
npm run dev
```

## Características principales

- Registro de agentes contra Twilio Voice con tokens efímeros.
- Llamadas salientes y control de mute/colgar.
- Banner para llamadas entrantes con aceptación/rechazo.
- Refresco automático del token cuando el SDK emite `tokenWillExpire`.
- PWA lista para instalar con `vite-plugin-pwa` y aviso de nuevas versiones.
- UI ligera con animaciones usando Framer Motion.
