// Rede de segurança contra travamentos inesperados. Sem isso, qualquer
// erro não previsto em qualquer tela (um dado corrompido, uma resposta
// inesperada do Firebase etc.) derruba o React inteiro e deixa uma tela
// completamente branca, sem nenhuma explicação nem forma de voltar —
// o pior cenário possível pra alguém usando o checklist numa unidade,
// sem ninguém técnico por perto pra ajudar. Com isso aqui, aparece uma
// mensagem simples com um botão pra recarregar.

import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error("Erro não tratado na interface:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24, textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>⚠️</div>
          <h2 style={{ fontSize: 16, marginBottom: 8 }}>Algo deu errado nessa tela</h2>
          <p style={{ fontSize: 13, color: "var(--sub)", marginBottom: 18 }}>
            Nenhuma resposta já preenchida do checklist foi perdida. Tente recarregar a página —
            se o problema continuar, avise o suporte.
          </p>
          <button className="btn" style={{ maxWidth: 240, margin: "0 auto" }} onClick={() => window.location.reload()}>
            Recarregar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
