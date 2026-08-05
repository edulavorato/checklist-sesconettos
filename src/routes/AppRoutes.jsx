import { Routes, Route } from "react-router-dom";
import RequireAuth from "./RequireAuth";
import LoginPage from "../pages/LoginPage";
import HomePage from "../pages/HomePage";
import ChecklistPage from "../pages/ChecklistPage";
import SummaryPage from "../pages/SummaryPage";
import HistoryPage from "../pages/HistoryPage";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<RequireAuth><HomePage /></RequireAuth>} />
      <Route path="/checklist/:templateId" element={<RequireAuth><ChecklistPage /></RequireAuth>} />
      <Route path="/checklist/:templateId/resumo" element={<RequireAuth><SummaryPage /></RequireAuth>} />
      <Route path="/historico" element={<RequireAuth><HistoryPage /></RequireAuth>} />
    </Routes>
  );
}
