import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { queryClient } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';

interface AuthContextValue {
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string) => Promise<{ error: string | null; needsConfirmation: boolean }>;
  sendPasswordReset: (email: string) => Promise<string | null>;
  updatePassword: (password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? 'E-mail ou senha incorretos.' : null;
  }

  async function signUp(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) {
      const text = error.message.toLowerCase();
      const message = text.includes('registered')
        ? 'Este e-mail já tem cadastro. Use "Entrar".'
        : text.includes('password')
          ? 'A senha precisa ter pelo menos 6 caracteres.'
          : 'Não foi possível criar a conta. Tente novamente.';
      return { error: message, needsConfirmation: false };
    }
    // Sem sessão: o projeto exige confirmação por e-mail
    return { error: null, needsConfirmation: !data.session };
  }

  // RF-02: o link do e-mail abre o app já logado na tela de nova senha
  async function sendPasswordReset(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/alterar-senha`,
    });
    return error ? 'Não foi possível enviar o e-mail. Tente novamente em alguns minutos.' : null;
  }

  async function updatePassword(password: string) {
    const { error } = await supabase.auth.updateUser({ password });
    if (!error) return null;
    if (error.message.toLowerCase().includes('different')) return 'A nova senha precisa ser diferente da atual.';
    return error.message.toLowerCase().includes('password') ? 'A senha precisa ter pelo menos 6 caracteres.' : 'Não foi possível alterar a senha.';
  }

  async function signOut() {
    await supabase.auth.signOut();
    queryClient.clear(); // não deixa dados em cache para o próximo usuário
  }

  return (
    <AuthContext.Provider value={{ session, loading, signIn, signUp, sendPasswordReset, updatePassword, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>');
  return ctx;
}
