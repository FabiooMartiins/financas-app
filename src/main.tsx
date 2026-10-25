import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/app/App';
import { applyTheme, savedTheme, watchSystemTheme } from '@/lib/theme';
import '@/styles/global.css';

applyTheme(savedTheme());
watchSystemTheme();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
