import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Protege rotas que só a administração pode acessar (ex.: Painel de Gestão).
// O papel ("role") vem do documento em `users/{uid}` e só pode ser alterado
// diretamente no Firebase Console — não existe forma de um usuário se
// promover a admin pelo próprio app (ver firestore.rules).
export default function RequireAdmin({ children }) {
  const { profile, loading } = useAuth();
  if (loading) return <p style={{ padding: 20 }}>Carregando...</p>;
  if (profile?.role !== "admin") return <Navigate to="/" replace />;
  return children;
}
