import { Routes, Route } from "react-router-dom";
import RequireAuth from "./RequireAuth";
import RequireAdmin from "./RequireAdmin";
import LoginPage from "../pages/LoginPage";
import HomePage from "../pages/HomePage";
import ChecklistPage from "../pages/ChecklistPage";
import SummaryPage from "../pages/SummaryPage";
import HistoryPage from "../pages/HistoryPage";
import HistoryDetailPage from "../pages/HistoryDetailPage";
import ManagementPage from "../pages/ManagementPage";
import ProfilePage from "../pages/ProfilePage";

export default function AppRoutes() {
  return (
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
  );
}
