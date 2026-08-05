import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Ajuste "checklist-app" para o nome real do repositório no GitHub
  // quando for publicar em https://<usuario>.github.io/<repo>/.
  // Se o repositório for do tipo <usuario>.github.io (site raiz), use base: "/".
  base: "/checklist-app/",
});
