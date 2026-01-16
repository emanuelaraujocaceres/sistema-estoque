// supabase.js - cliente simplificado
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;

// Validação
if (!supabaseUrl || !supabaseKey) {
  console.error(" ERRO: Supabase não configurado!");
  console.log("Crie um arquivo .env com:");
  console.log("VITE_SUPABASE_URL=sua_url");
  console.log("VITE_SUPABASE_KEY=sua_chave");
  
  // URL de fallback para desenvolvimento
  const fallbackUrl = "https://exemplo.supabase.co";
  const fallbackKey = "exemplo-chave-publica";
  
  console.warn(` Usando fallback: ${fallbackUrl}`);
}

export const supabase = createClient(
  supabaseUrl || "https://exemplo.supabase.co",
  supabaseKey || "exemplo-chave-publica",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false // Evita problemas de redirect
    },
    global: {
      headers: {
        "x-application-name": "estoque-caixa"
      }
    }
  }
);
