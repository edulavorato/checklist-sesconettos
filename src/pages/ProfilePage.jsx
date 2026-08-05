import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { saveUserProfile } from "../firebase/profile";
import BottomNav from "../components/BottomNav";

export default function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState(profile?.displayName || "");
  const [cargo, setCargo] = useState(profile?.cargo || "");
  const [unitId, setUnitId] = useState(profile?.unitId || "unidade-demo");
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);
    setSavedMsg(false);
    try {
      await saveUserProfile(user.uid, { displayName, cargo, unitId });
      await refreshProfile(user.uid);
      setSavedMsg(true);
    } catch (err) {
      setErrorMsg("Não foi possível salvar: " + (err.message || "erro desconhecido"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="topbar brand">
        <div className="topbar-title">Meu perfil</div>
        <div className="topbar-sub">{user?.email}</div>
      </div>
      <div className="content">
        <form onSubmit={handleSave}>
          <label className="flabel">Nome</label>
          <input
            className="finput"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Seu nome completo"
          />
          <label className="flabel">Cargo</label>
          <input
            className="finput"
            value={cargo}
            onChange={(e) => setCargo(e.target.value)}
            placeholder="Ex: Gerente, Supervisor..."
          />
          <label className="flabel">Unidade</label>
          <input
            className="finput"
            value={unitId}
            onChange={(e) => setUnitId(e.target.value)}
            placeholder="Ex: ASA SUL"
          />

          {errorMsg && (
            <div style={{ background: "var(--warn-bg)", color: "var(--warn)", padding: "10px 12px", borderRadius: 8, marginBottom: 12, fontSize: 13 }}>
              {errorMsg}
            </div>
          )}
          {savedMsg && (
            <div style={{ background: "var(--ok-bg)", color: "var(--ok)", padding: "10px 12px", borderRadius: 8, marginBottom: 12, fontSize: 13 }}>
              Perfil salvo com sucesso.
            </div>
          )}

          <button className="btn" type="submit" disabled={saving}>
            {saving && <span className="spinner" />}
            {saving ? "Salvando..." : "Salvar perfil"}
          </button>
        </form>
        <p style={{ fontSize: 11.5, color: "var(--sub)", marginTop: 14, textAlign: "center" }}>
          Nome e cargo aparecem no PDF de cada checklist como identificação de quem aplicou.
          A unidade define quais dados de histórico e gestão você acessa.
        </p>
        <button className="btn outline" style={{ marginTop: 14 }} onClick={() => navigate("/")}>
          Voltar ao início
        </button>
      </div>
      <BottomNav />
    </>
  );
}
