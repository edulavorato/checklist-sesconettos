import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginWithEmail } from "../firebase/auth";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await loginWithEmail(email, password);
      navigate("/");
    } catch (err) {
      setError("E-mail ou senha inválidos.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-brand">Sesconetto's</div>
      <h1 className="login-title">Checklist Unidades</h1>
      <p className="login-sub">Entre com seu usuário da unidade</p>
      <form onSubmit={handleSubmit}>
        <label className="flabel">E-mail</label>
        <input
          className="finput"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <label className="flabel">Senha</label>
        <input
          className="finput"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p style={{ color: "#d64545", fontSize: 12 }}>{error}</p>}
        <button className="btn" type="submit" disabled={loading}>
          {loading && <span className="spinner" />}
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
