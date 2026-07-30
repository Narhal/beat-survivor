import { defineConfig } from "vite";

export default defineConfig({
  base: "./", // le site vit sous /play-beat-survivor/ sur GitHub Pages
  build: { target: "es2020" },
});
