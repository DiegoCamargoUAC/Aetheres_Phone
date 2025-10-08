import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { TwilioProvider } from './context/TwilioContext';
import { setupPwaListeners } from './pwa';

setupPwaListeners();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <TwilioProvider>
      <App />
    </TwilioProvider>
  </React.StrictMode>
);
