import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { App } from '@/app/App';
import '@/styles/global.css';

// Service worker: quando sai versão nova, recarrega sozinho (senão o iPhone segue na cópia antiga).
// Também procura atualização ao voltar para o app, que no iPhone fica muito tempo em segundo plano.
registerSW({
  immediate: true,
  onRegisteredSW(_url, registration) {
    if (!registration) return;
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') registration.update();
    });
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
