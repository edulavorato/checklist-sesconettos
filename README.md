# Checklist Unidades

Sistema próprio de checklist operacional (fechamento/abertura de unidades), substituindo o ChecklistFácil. Acessado direto pelo navegador (Modelo 5) — sem app de loja, publicado no GitHub Pages, com Firebase por trás.

## Estrutura do projeto

```
src/
├── main.jsx              # ponto de entrada
├── App.jsx                # monta o Router + AuthProvider
├── firebase/               # TODA comunicação com o Firebase passa por aqui
│   ├── config.js             # inicialização (lê as chaves do .env)
│   ├── auth.js                # login/logout
│   ├── firestore.js          # criar/ler/atualizar checklists no banco
│   └── storage.js            # upload de fotos
├── context/
│   └── AuthContext.jsx     # estado global de "quem está logado"
├── hooks/
│   ├── useGeolocation.js     # captura de GPS do navegador
│   └── useChecklistRun.js    # estado de uma aplicação em andamento (área atual, respostas)
├── logic/                  # regras de negócio puras (sem depender de tela nem Firebase)
│   ├── scoring.js             # cálculo de nota por área e total
│   └── validation.js          # "essa área está completa o suficiente pra avançar?"
├── data/
│   └── checklistTemplates.js # estrutura do checklist "Fechamento" (áreas/itens/pesos)
├── components/              # peças de UI reutilizáveis entre as telas
│   ├── ItemCard.jsx
│   ├── PhotoCapture.jsx
│   ├── GpsCapture.jsx
│   ├── ProgressBar.jsx
│   ├── ScoreRing.jsx
│   └── BottomNav.jsx
├── pages/                   # uma tela = um arquivo
│   ├── LoginPage.jsx
│   ├── HomePage.jsx
│   ├── ChecklistPage.jsx
│   ├── SummaryPage.jsx
│   └── HistoryPage.jsx
├── routes/
│   ├── AppRoutes.jsx          # mapa de URLs -> páginas
│   └── RequireAuth.jsx        # bloqueia telas para quem não está logado
└── styles/
    └── globals.css           # todo o visual do app (reaproveitado do protótipo)
```

A ideia dessa separação: se algo quebrar ou precisar mudar, dá pra saber exatamente em qual arquivo mexer — regra de pontuação errada é só em `logic/scoring.js`, tela de login com bug é só em `pages/LoginPage.jsx`, e assim por diante. Nenhum arquivo deveria passar de ~150 linhas.

## Como rodar localmente

```bash
npm install
cp .env.example .env   # depois preencher com as chaves do SEU projeto Firebase
npm run dev
```

## Como publicar (GitHub Pages)

1. Criar um projeto no [Firebase Console](https://console.firebase.google.com/), ativar **Authentication** (e-mail/senha), **Firestore** e **Storage**.
2. Copiar as chaves do app web para o `.env` local (para testar) e também para **Settings → Secrets → Actions** do repositório no GitHub (para o deploy automático).
3. Ajustar `base` em `vite.config.js` para bater com o nome do repositório.
4. Fazer push para a branch `main` — o workflow em `.github/workflows/deploy.yml` builda e publica automaticamente no GitHub Pages.
5. Aplicar as regras de `firebase/firestore.rules` no console do Firebase (Firestore → Regras).

## Status atual (fase de desenvolvimento)

- [x] Estrutura de pastas e roteamento
- [x] Tela de login (ligada ao Firebase Auth)
- [x] Tela inicial com lista de checklists
- [x] Fluxo de checklist por área, com foto (câmera real) e GPS (real) por item
- [x] Cálculo de nota e tela de resumo
- [x] Tela de histórico (lendo do Firestore)
- [ ] Criar o projeto Firebase real e preencher o `.env`
- [ ] Testar login de verdade (hoje ainda não existe nenhum usuário cadastrado)
- [ ] Popular `checklistTemplates` no Firestore (hoje está fixo no código)
- [ ] Ajustar regras de segurança do Firestore para o modelo de permissões final (gerente só vê a própria unidade)
- [ ] Editor de checklist (fase futura — hoje a estrutura é fixa em `data/checklistTemplates.js`)
