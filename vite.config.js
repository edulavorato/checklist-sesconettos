import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Nome do repositório real no GitHub: checklist-sesconettos
  // Publicado em https://edulavorato.github.io/checklist-sesconettos/
  base: "/checklist-sesconettos/",
});
