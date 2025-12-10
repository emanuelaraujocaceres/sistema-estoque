# Guia de Setup do Supabase para Sincronização Multi-Device

## Passo 1: Verificar as Tabelas no Supabase

Acesse o painel do Supabase (https://app.supabase.com) e vá até a aba "SQL Editor".

Execute os seguintes SQL scripts para criar as tabelas necessárias:

### 1. Tabela de Produtos

```sql
CREATE TABLE IF NOT EXISTS products (
  id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sku TEXT,
  price DECIMAL(10, 2) DEFAULT 0,
  cost DECIMAL(10, 2) DEFAULT 0,
  stock INTEGER DEFAULT 0,
  min_stock INTEGER DEFAULT 0,
  sale_type TEXT DEFAULT 'unit' CHECK (sale_type IN ('unit', 'weight')),
  price_per_kilo DECIMAL(10, 2),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (id, user_id)
);

-- Criar índices para performance
CREATE INDEX idx_products_user_id ON products(user_id);
CREATE INDEX idx_products_created_at ON products(created_at DESC);
```

### 2. Tabela de Vendas

```sql
CREATE TABLE IF NOT EXISTS sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  items JSONB NOT NULL,
  total DECIMAL(10, 2) NOT NULL,
  payment_method TEXT NOT NULL,
  amount_received DECIMAL(10, 2),
  change DECIMAL(10, 2),
  status TEXT DEFAULT 'completed' CHECK (status IN ('completed', 'cancelled')),
  transaction_id TEXT UNIQUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Criar índices
CREATE INDEX idx_sales_user_id ON sales(user_id);
CREATE INDEX idx_sales_created_at ON sales(created_at DESC);
CREATE INDEX idx_sales_transaction_id ON sales(transaction_id);
```

### 3. Tabela de Usuários (Extensão de Auth)

```sql
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT UNIQUE,
  avatar TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Criar índice
CREATE INDEX idx_users_email ON users(email);
```

## Passo 2: Habilitar Realtime (Sincronização em Tempo Real)

No painel Supabase, vá para **Database** → **Replication** e habilite o Realtime para as tabelas:

- `products` ✅
- `sales` ✅
- `users` ✅

## Passo 3: Configurar Row Level Security (RLS)

Para garantir que cada usuário só veja seus próprios dados:

### Produtos - Habilitar RLS

```sql
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Política: Cada usuário vê apenas seus produtos
CREATE POLICY "Usuários veem apenas seus produtos"
  ON products FOR SELECT
  USING (auth.uid() = user_id);

-- Política: Cada usuário pode inserir seus próprios produtos
CREATE POLICY "Usuários inserem seus próprios produtos"
  ON products FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Política: Cada usuário pode atualizar seus próprios produtos
CREATE POLICY "Usuários atualizam seus próprios produtos"
  ON products FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Política: Cada usuário pode deletar seus próprios produtos
CREATE POLICY "Usuários deletam seus próprios produtos"
  ON products FOR DELETE
  USING (auth.uid() = user_id);
```

### Vendas - Habilitar RLS

```sql
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

-- Política: Cada usuário vê apenas suas vendas
CREATE POLICY "Usuários veem apenas suas vendas"
  ON sales FOR SELECT
  USING (auth.uid() = user_id);

-- Política: Cada usuário pode inserir suas vendas
CREATE POLICY "Usuários inserem suas vendas"
  ON sales FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Política: Cada usuário pode atualizar suas vendas
CREATE POLICY "Usuários atualizam suas vendas"
  ON sales FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

### Usuários - Habilitar RLS

```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Política: Cada usuário vê apenas seus dados
CREATE POLICY "Usuários veem apenas seus dados"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Política: Cada usuário pode atualizar seus dados
CREATE POLICY "Usuários atualizam seus dados"
  ON users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Política: Cada usuário pode inserir seus dados
CREATE POLICY "Usuários inserem seus dados"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);
```

## Passo 4: Testar a Sincronização

1. **Abra a aplicação em dois navegadores ou dispositivos diferentes**
2. Faça login com a **mesma conta** em ambos
3. **No primeiro dispositivo**: Crie um novo produto ou faça uma venda
4. **No segundo dispositivo**: Recarregue a página (Ctrl+F5 hard reload)
5. Os dados devem aparecer **instantaneamente** (realtime) ou ao recarregar

## Passo 5: Monitorar Logs

No painel Supabase, vá para **Logs** para verificar se há erros:

- `PostgreSQL Logs` - Erros de banco de dados
- `Realtime Logs` - Erros de sincronização em tempo real
- `API Logs` - Erros de requisições

## Troubleshooting

### Dados não sincronizam entre dispositivos

1. Abra o **F12 Console** em ambos os navegadores
2. Procure por mensagens de erro que começam com **❌** ou **⚠️**
3. Verifique se:
   - Você está logado com a **mesma conta**
   - O `user_id` é o mesmo em ambos os dispositivos
   - As políticas de RLS estão corretas

### Erro: "Row Level Security" ou "Permission denied"

- Verifique se as políticas de RLS foram criadas corretamente
- Certifique-se de que `auth.uid()` está sendo usado correto

### Realtime não funciona

- Verifique se o Realtime está **habilitado** para as tabelas
- Verifique se a sua `SUPABASE_ANON_KEY` no arquivo `.env` está correta

## Variáveis de Ambiente Necessárias

No seu arquivo `.env.local` ou `.env`, certifique-se de ter:

```env
VITE_SUPABASE_URL=https://fsktcwbtzrnnkjpzfchv.supabase.co
VITE_SUPABASE_ANON_KEY=seu_anon_key_aqui
```

## Como o Sistema Funciona

1. **Primeira carregamento**: Carrega do localStorage (rápido)
2. **Login**: Sincroniza com Supabase e ativa realtime listeners
3. **Mudanças locais**: Salva localmente + envia para Supabase
4. **Mudanças remotas** (outro dispositivo): Recebe via Realtime e atualiza UI
5. **Offline**: Usa localStorage, sincroniza quando voltar online

## Próximos Passos

- [ ] Criar as tabelas no Supabase (SQL acima)
- [ ] Habilitar Realtime para as tabelas
- [ ] Configurar Row Level Security
- [ ] Testar sincronização entre dispositivos
- [ ] Monitorar logs para erros

---

**Dúvidas?** Verifique os logs do navegador (F12) para mensagens de erro detalhadas.
