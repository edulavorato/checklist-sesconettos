// Contexto global de autenticação — expõe `user`, `profile` (nome/cargo/
// unidade) e `loading` para o app inteiro via useAuth(), sem cada tela
// precisar assinar o Firebase Auth ou buscar o perfil por conta própria.

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { subscribeToAuthChanges } from "../firebase/auth";
import { getUserProfile } from "../firebase/profile";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [configError, setConfigError] = useState(null);

  const refreshProfile = useCallback(async (uid) => {
    const targetUid = uid || user?.uid;
    if (!targetUid) return;
    try {
      const data = await getUserProfile(targetUid);
      setProfile(data);
    } catch {
      // Sem perfil salvo ainda (ou sem permissão) — segue com valores padrão.
      setProfile(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  useEffect(() => {
    try {
      const unsubscribe = subscribeToAuthChanges(
        async (firebaseUser) => {
          setUser(firebaseUser);
          if (firebaseUser) {
            try {
              setProfile(await getUserProfile(firebaseUser.uid));
            } catch {
              setProfile(null);
            }
          } else {
            setProfile(null);
          }
          setLoading(false);
        },
        (err) => {
          // Acontece quando o .env ainda não tem as chaves reais do Firebase.
          setConfigError(err.message);
          setLoading(false);
        }
      );
      return unsubscribe;
    } catch (err) {
      setConfigError(err.message);
      setLoading(false);
    }
  }, []);

  if (configError) {
    return (
      <div style={{ padding: 24, fontFamily: "sans-serif", fontSize: 13, color: "#8a5a00", background: "#fff7e6" }}>
        <b>Firebase ainda não configurado.</b>
        <p>Preencha o arquivo <code>.env</code> com as chaves do seu projeto Firebase (veja <code>.env.example</code>) para o app funcionar de verdade.</p>
        <p style={{ opacity: .7 }}>Detalhe técnico: {configError}</p>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de <AuthProvider>");
  return ctx;
}
