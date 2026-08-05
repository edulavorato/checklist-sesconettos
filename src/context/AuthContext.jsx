// Contexto global de autenticação — expõe `user` e `loading` para o app inteiro
// via useAuth(), sem cada tela precisar assinar o Firebase Auth por conta própria.

import { createContext, useContext, useEffect, useState } from "react";
import { subscribeToAuthChanges } from "../firebase/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [configError, setConfigError] = useState(null);

  useEffect(() => {
    try {
      const unsubscribe = subscribeToAuthChanges(
        (firebaseUser) => {
          setUser(firebaseUser);
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
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de <AuthProvider>");
  return ctx;
}
