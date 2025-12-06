import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { VitePWA } from "vite-plugin-pwa"

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      
      // ✅ 1. USA SEU manifest.json DA PASTA PUBLIC
      manifest: false, // Não gera um novo, usa o seu
      
      // ✅ 2. INCLUI TODOS OS SEUS ÍCONES
      includeAssets: [
        "vite.svg",
        "icon-72x72.png",
        "icon-96x96.png", 
        "icon-128x128.png",
        "icon-144x144.png", // ← CRÍTICO!
        "icon-152x152.png",
        "icon-192x192.png",
        "icon-384x384.png",
        "icon-512x512.png"
      ],
      
      // ✅ 3. WORKBOX PARA CACHE
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,jpg,jpeg,json}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 ano
              }
            }
          }
        ]
      },
      
      // ✅ 4. DEV OPTIONS
      devOptions: {
        enabled: false, // Desativa em desenvolvimento para evitar conflitos
        type: "module"
      }
    })
  ],
  
  // ✅ 5. GARANTE QUE PUBLIC/ SERVE OS ARQUIVOS
  publicDir: "public"
})