// Tema do app (RF-34). Escuro é o padrão; a escolha fica no aparelho (localStorage)
// e no perfil, para valer também em outros aparelhos.
export type ThemeChoice = 'dark' | 'light' | 'system';

const KEY = 'tema';

export const themeLabels: Record<ThemeChoice, string> = {
  dark: 'Escuro',
  light: 'Claro',
  system: 'Igual ao aparelho',
};

export function savedTheme(): ThemeChoice {
  try {
    const value = localStorage.getItem(KEY);
    if (value === 'dark' || value === 'light' || value === 'system') return value;
  } catch {
    // modo privado ou armazenamento bloqueado: segue o padrão
  }
  return 'dark';
}

function resolve(choice: ThemeChoice): 'dark' | 'light' {
  if (choice !== 'system') return choice;
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

/** Aplica no <html> e na barra do navegador/PWA. */
export function applyTheme(choice: ThemeChoice) {
  const mode = resolve(choice);
  document.documentElement.dataset.theme = mode;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', mode === 'dark' ? '#0E1412' : '#0E6B58');
}

export function setTheme(choice: ThemeChoice) {
  try {
    localStorage.setItem(KEY, choice);
  } catch {
    // ignora: o tema vale só nesta sessão
  }
  applyTheme(choice);
}

/** Acompanha a troca de claro/escuro do aparelho quando a escolha é "Igual ao aparelho". */
export function watchSystemTheme(): () => void {
  const media = window.matchMedia('(prefers-color-scheme: light)');
  const onChange = () => {
    if (savedTheme() === 'system') applyTheme('system');
  };
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}
