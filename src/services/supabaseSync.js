// src/services/supabaseSync.js - Sincronização em tempo real com Supabase
import { supabase } from '../auth/supabaseClient';

const PRODUCTS_TABLE = 'produtos';
const SALES_TABLE = 'vendas';
const USERS_TABLE = 'clientes';

// Gerar UUID v4 simples (compatível com Supabase)
function generateUUID(seed) {
  // Usa seed (ID do app) para gerar UUID determinístico
  const str = String(seed);
  const hash = str.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  
  // Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  const uuid = [
    ('00000000' + Math.abs(hash).toString(16)).slice(-8),
    ('0000' + Math.abs(hash * 2).toString(16)).slice(-4),
    ('0000' + Math.abs(hash * 3).toString(16)).slice(-4),
    ('0000' + Math.abs(hash * 4).toString(16)).slice(-4),
    ('000000000000' + Math.abs(hash * 5).toString(16)).slice(-12),
  ].join('-');
  
  return uuid;
}

/**
 * Sincronizar produtos com Supabase
 * Tenta enviar para Supabase, fallback para localStorage
 */
export async function syncProductsToSupabase(products, userId) {
  if (!userId || !products) {
    console.warn('⚠️ syncProductsToSupabase: userId ou products ausentes', { userId, hasProducts: !!products });
    return false;
  }
  
  try {
    console.log('🔄 [supabaseSync] Sincronizando', products.length, 'produtos...', { userId });
    
    // Preparar dados para Supabase - MAPEAR CAMPOS DO APP PARA BANCO
    const productsToSync = products.map(p => ({
      id: generateUUID(p.id), // Converter ID para UUID
      user_id: userId,
      nome: p.name,
      descricao: p.descricao || '',
      categoria: p.categoria || '',
      preco_custo: parseFloat(p.cost) || 0,
      preco_venda: parseFloat(p.price) || 0,
      quantidade: parseInt(p.stock) || 0,
      quantidade_minima: parseInt(p.min_stock) || 0,
      unidade_medida: p.saleType === 'weight' ? 'kg' : 'un',
      codigo_barras: p.sku || '',
      fornecedor: p.fornecedor || '',
      localizacao: p.localizacao || '',
      imagem_url: p.imagem_url || '',
      ativo: p.ativo !== false,
      criado_em: p.created_at || new Date().toISOString(),
      atualizado_em: new Date().toISOString(),
    }));

    console.log('📝 [supabaseSync] Primeiro produto formatado:', productsToSync[0]);

    // Usar upsert para criar ou atualizar
    const { data, error } = await supabase
      .from(PRODUCTS_TABLE)
      .upsert(productsToSync, { onConflict: 'id' });

    if (error) {
      console.error('❌ [supabaseSync] Erro ao fazer upsert:', error);
      return false;
    }

    console.log('✅ [supabaseSync] Sucesso! Produtos sincronizados:', productsToSync.length);
    return true;
  } catch (err) {
    console.error('❌ [supabaseSync] Erro crítico:', err);
    return false;
  }
}

/**
 * Carregar produtos do Supabase
 */
export async function loadProductsFromSupabase(userId) {
  if (!userId) return null;

  try {
    const { data, error } = await supabase
      .from(PRODUCTS_TABLE)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) {
      console.warn('⚠️ Erro ao carregar produtos do Supabase:', error);
      return null;
    }

    if (!data || data.length === 0) {
      console.log('ℹ️ Nenhum produto encontrado no Supabase');
      return [];
    }

    // Converter formato Supabase para formato local
    return data.map(p => ({
      id: p.id,
      name: p.nome,
      sku: p.codigo_barras,
      price: p.preco_venda,
      cost: p.preco_custo,
      stock: p.quantidade,
      min_stock: p.quantidade_minima,
      saleType: p.unidade_medida === 'kg' ? 'weight' : 'unit',
      pricePerKilo: p.unidade_medida === 'kg' ? p.preco_venda : undefined,
      descricao: p.descricao,
      categoria: p.categoria,
      fornecedor: p.fornecedor,
      localizacao: p.localizacao,
      imagem_url: p.imagem_url,
      ativo: p.ativo,
      created_at: p.criado_em,
      updated_at: p.atualizado_em,
    }));
  } catch (err) {
    console.error('❌ Erro crítico ao carregar produtos:', err);
    return null;
  }
}

/**
 * Sincronizar venda com Supabase
 */
export async function syncSaleToSupabase(saleData, userId) {
  if (!userId || !saleData) return false;

  try {
    const saleToSync = {
      user_id: userId,
      codigo: saleData.codigo || '',
      cliente_nome: saleData.clienteName || '',
      cliente_contato: saleData.clienteContato || '',
      itens: saleData.items || [],
      subtotal: parseFloat(saleData.subtotal) || 0,
      desconto: parseFloat(saleData.discount) || 0,
      total: parseFloat(saleData.total) || 0,
      forma_pagamento: saleData.paymentMethod || 'dinheiro',
      status: 'concluida',
      observacoes: saleData.observacoes || '',
      criado_em: new Date().toISOString(),
    };

    const { error } = await supabase
      .from(SALES_TABLE)
      .insert([saleToSync]);

    if (error) {
      console.warn('⚠️ Erro ao sincronizar venda com Supabase:', error);
      return false;
    }

    console.log('✅ Venda sincronizada com Supabase');
    return true;
  } catch (err) {
    console.error('❌ Erro crítico ao sincronizar venda:', err);
    return false;
  }
}

/**
 * Carregar vendas do Supabase
 */
export async function loadSalesFromSupabase(userId) {
  if (!userId) return [];

  try {
    const { data, error } = await supabase
      .from(SALES_TABLE)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.warn('⚠️ Erro ao carregar vendas do Supabase:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('❌ Erro crítico ao carregar vendas:', err);
    return [];
  }
}

/**
 * Setup de listeners em tempo real (Realtime do Supabase)
 * Quando alguém atualiza de outro dispositivo, sincroniza aqui
 */
export function setupRealtimeListeners(userId, onProductsChange) {
  if (!userId) return null;

  // Escutar mudanças em produtos
  const productsSubscription = supabase
    .channel(`products:user_id=eq.${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: PRODUCTS_TABLE,
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        console.log('🔔 Mudança em produtos detectada:', payload);
        // Disparar evento para atualizar UI
        if (onProductsChange) onProductsChange(payload);
        window.dispatchEvent(new CustomEvent('products-updated-remote', { detail: payload }));
      }
    )
    .subscribe();

  return productsSubscription;
}

/**
 * Sincronizar dados do usuário (avatar, nome, etc)
 */
export async function syncUserToSupabase(userId, userData) {
  if (!userId || !userData) return false;

  try {
    const { error } = await supabase
      .from(USERS_TABLE)
      .upsert({
        id: userId,
        name: userData.name,
        email: userData.email,
        avatar: userData.avatar,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });

    if (error) {
      console.warn('⚠️ Erro ao sincronizar usuário:', error);
      return false;
    }

    console.log('✅ Usuário sincronizado com Supabase');
    return true;
  } catch (err) {
    console.error('❌ Erro ao sincronizar usuário:', err);
    return false;
  }
}

/**
 * Carregar dados do usuário
 */
export async function loadUserFromSupabase(userId) {
  if (!userId) return null;

  try {
    const { data, error } = await supabase
      .from(USERS_TABLE)
      .select('*')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
      console.warn('⚠️ Erro ao carregar usuário:', error);
      return null;
    }

    return data || null;
  } catch (err) {
    console.error('❌ Erro ao carregar usuário:', err);
    return null;
  }
}

/**
 * Forçar sincronização completa (útil no login)
 */
export async function fullSync(userId, products, sales) {
  console.log('🔄 Iniciando sincronização completa...');
  
  const syncProducts = await syncProductsToSupabase(products, userId);
  
  let syncSales = true;
  if (sales && Array.isArray(sales)) {
    for (const sale of sales) {
      const result = await syncSaleToSupabase(sale, userId);
      if (!result) syncSales = false;
    }
  }

  console.log(`✅ Sincronização completa: Produtos=${syncProducts}, Vendas=${syncSales}`);
  return syncProducts && syncSales;
}
