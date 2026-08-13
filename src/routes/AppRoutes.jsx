import { Suspense, lazy } from "react";
import { Routes, Route } from "react-router-dom";
import RequireAuth from "./RequireAuth";
import RequireAdmin from "./RequireAdmin";
import LoginPage from "../pages/LoginPage";
import HomePage from "../pages/HomePage";

// As telas abaixo são carregadas sob demanda (só quando a rota é
// acessada), em vez de tudo junto no primeiro carregamento — Login e
// Início continuam sempre juntos no pacote principal (são as primeiras
// telas que todo mundo vê), o resto baixa conforme a pessoa navega. Isso
// importa especialmente hoje: gerente numa unidade, com wi-fi ou dados
// móveis mais fracos, não deveria esperar carregar o código do Painel de
// Gestão (que só admin usa) só pra abrir o checklist do dia.
const ChecklistPage = lazy(() => import("../pages/ChecklistPage"));
const SummaryPage = lazy(() => import("../pages/SummaryPage"));
const HistoryPage = lazy(() => import("../pages/HistoryPage"));
const HistoryDetailPage = lazy(() => import("../pages/HistoryDetailPage"));
const ManagementPage = lazy(() => import("../pages/ManagementPage"));
const ProfilePage = lazy(() => import("../pages/ProfilePage"));

function RouteLoading() {
  return (
    <div className="content" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "40vh" }}>
      <span className="spinner" style={{ borderColor: "rgba(149,11,10,.2)", borderTopColor: "var(--primary)" }} />
    </div>
  );
}

export default function AppRoutes() {
  return (
    <Suspense fallback={<RouteLoading />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<RequireAuth><HomePage /></RequireAuth>} />
        <Route path="/checklist/:templateId" element={<RequireAuth><ChecklistPage /></RequireAuth>} />
        <Route path="/checklist/:templateId/resumo" element={<RequireAuth><SummaryPage /></RequireAuth>} />
        <Route path="/historico" element={<RequireAuth><HistoryPage /></RequireAuth>} />
        <Route path="/historico/:runId" element={<RequireAuth><HistoryDetailPage /></RequireAuth>} />
        <Route path="/gestao" element={<RequireAuth><RequireAdmin><ManagementPage /></RequireAdmin></RequireAuth>} />
        <Route path="/perfil" element={<RequireAuth><ProfilePage /></RequireAuth>} />
      </Routes>
    </Suspense>
  );
}
