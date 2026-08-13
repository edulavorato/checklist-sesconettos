// Lista os logins das unidades (perfis com role != admin) e permite que o
// administrador edite nome/cargo/unidade de qualquer um deles — útil pra
// corrigir o nome de exibição de um login compartilhado entre uma equipe,
// sem precisar que a própria unidade entre no app e mude o Perfil.
//
// Não dá pra promover ninguém a admin por aqui (nem trocar e-mail/senha —
// isso é Firebase Auth, só pelo Console) — só os três campos que também
// aparecem na tela de Perfil de cada usuário.

import { useEffect, useState } from "react";
import { getAllUsers, saveUserProfile } from "../firebase/profile";
import { UNITS } from "../data/units";

export default function UnitLoginsManager() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ displayName: "", cargo: "", unitId: "" });
  const [saving, setSaving] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setErrorMsg(null);
      try {
        const all = await getAllUsers();
        setUsers(all.filter((u) => u.role !== "admin"));
      } catch (err) {
        setErrorMsg("Não foi possível carregar os logins: " + (err.message || "erro desconhecido"));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [reloadKey]);

  function startEdit(u) {
    setEditingId(u.id);
    setErrorMsg(null);
    setForm({ displayName: u.displayName || "", cargo: u.cargo || "", unitId: u.unitId || "" });
  }

  async function handleSave(uid) {
    setSaving(true);
    setErrorMsg(null);
    try {
      await saveUserProfile(uid, form);
      setEditingId(null);
      setReloadKey((k) => k + 1);
    } catch (err) {
      setErrorMsg("Não foi possível salvar: " + (err.message || "erro desconhecido"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p style={{ fontSize: 12.5, color: "var(--sub)" }}>Carregando logins...</p>;

  return (
    <div>
      {errorMsg && (
        <div style={{ background: "var(--warn-bg)", color: "var(--warn)", padding: "10px 12px", borderRadius: 8, marginBottom: 10, fontSize: 12.5 }}>
          {errorMsg}
        </div>
      )}
      {users.map((u) => (
        <div className="card" key={u.id} style={{ cursor: "default", padding: "10px 12px", marginBottom: 8 }}>
          {editingId === u.id ? (
            <>
              <label className="flabel">Nome</label>
              <input
                className="finput"
                style={{ marginBottom: 8 }}
                value={form.displayName}
                onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                placeholder="Nome de exibição"
              />
              <label className="flabel">Cargo</label>
              <input
                className="finput"
                style={{ marginBottom: 8 }}
                value={form.cargo}
                onChange={(e) => setForm({ ...form, cargo: e.target.value })}
                placeholder="Ex: Gerente"
              />
              <label className="flabel">Unidade</label>
              <select
                className="finput"
                style={{ marginBottom: 10 }}
                value={form.unitId}
                onChange={(e) => setForm({ ...form, unitId: e.target.value })}
              >
                <option value="">Selecione a unidade</option>
                {UNITS.map((unit) => (
                  <option key={unit} value={unit}>{unit}</option>
                ))}
              </select>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn" style={{ margin: 0, flex: 1 }} disabled={saving} onClick={() => handleSave(u.id)}>
                  {saving && <span className="spinner" />}
                  {saving ? "Salvando..." : "Salvar"}
                </button>
                <button className="btn outline" style={{ margin: 0, flex: 1 }} disabled={saving} onClick={() => setEditingId(null)}>
                  Cancelar
                </button>
              </div>
            </>
          ) : (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
              <div>
                <div style={{ fontWeight: 700 }}>{u.displayName || "(sem nome)"}</div>
                <div className="hist-meta">{u.cargo || "sem cargo"} · {u.unitId || "sem unidade"}</div>
              </div>
              <button
                className="btn outline"
                style={{ margin: 0, width: "auto", padding: "8px 14px", fontSize: 12, flexShrink: 0 }}
                onClick={() => startEdit(u)}
              >
                Editar
              </button>
            </div>
          )}
        </div>
      ))}
      {!users.length && (
        <p style={{ fontSize: 12.5, color: "var(--sub)" }}>
          Nenhum login de unidade cadastrado ainda — crie no Firebase Console (Authentication) e peça pra
          fazerem login e preencher o Perfil pelo menos uma vez pra aparecerem aqui.
        </p>
      )}
    </div>
  );
}
