// src/test-supabase.js
// Teste DIRETO do Supabase

console.log('🧪 TESTE SUPABASE DIRETO')

// Testa se está disponível
if (window.supabase) {
  console.log('✅ window.supabase disponível')
  
  // Testa a função de login
  console.log('🔍 Testando funções auth...')
  console.log('1. getSession?', typeof window.supabase.auth.getSession)
  console.log('2. signInWithPassword?', typeof window.supabase.auth.signInWithPassword)
  console.log('3. onAuthStateChange?', typeof window.supabase.auth.onAuthStateChange)
  
  // Tenta pegar sessão atual
  window.supabase.auth.getSession().then(({ data }) => {
    console.log('🔐 Sessão atual:', data?.session ? 'Logado' : 'Não logado')
    if (data?.session) {
      console.log('👤 Usuário:', data.session.user.email)
    }
  }).catch(err => {
    console.error('❌ Erro ao buscar sessão:', err)
  })
  
} else {
  console.error('❌ window.supabase NÃO disponível!')
  
  // Tenta criar manualmente
  console.log('🔄 Tentando criar manualmente...')
  
  // 🔥 USE SUAS CREDENCIAIS AQUI TAMBÉM
  const url = 'https://zywsgazlzkeawlcjxscq.supabase.co'
  const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5d3NnYXpsemtlYXdsY2p4c2NxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYyMTQ4MTMsImV4cCI6MjA1MTc5MDgxM30.c_FhJzO4tq-DtxwMDQmeCbE9mZmBUKt6A3U7sIY0xEM'
  
  import('https://esm.sh/@supabase/supabase-js@2.87.0').then(({ createClient }) => {
    window.supabase = createClient(url, key, {
      auth: { persistSession: true }
    })
    console.log('✅ Supabase criado manualmente!')
  })
}