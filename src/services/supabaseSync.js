// src/services/supabaseSync.js - Sincronização em tempo real com Supabase
import { supabase } from '../auth/supabaseClient';

const PRODUCTS_TABLE = 'products';
const SALES_TABLE = 'sales';
const USERS_TABLE = 'users';

/**
 * Sincronizar produtos com Supabase
 * Tenta enviar para Supabase, fallback para localStorage
 */
export async function syncProductsToSupabase(products, userId) {
  if (!userId || !products) return false;
  
  try {
    // Preparar dados para Supabase
    const productsToSync = products.map(p => ({
      id: p.id,
      user_id: userId,
      name: p.name,
      sku: p.sku || '',
      price: p.price || 0,
      cost: p.cost || 0,
      stock: p.stock || 0,
      min_stock: p.min_stock || 0,
      sale_type: p.saleType || 'unit',
      price_per_kilo: p.saleType === 'weight' ? (p.pricePerKilo || p.price) : null,
      created_at: p.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    // Usar upsert para criar ou atualizar
    const { error } = await supabase
      .from(PRODUCTS_TABLE)
      .upsert(productsToSync, { onConflict: 'id,user_id' });

    if (error) {
      console.warn('⚠️ Erro ao sincronizar produtos com Supabase:', error);
      return false;
    }

    console.log('✅ Produtos sincronizados com Supabase');
    return true;
  } catch (err) {
    console.error('❌ Erro crítico na sincronização:', err);
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
      name: p.name,
      sku: p.sku,
      price: p.price,
      cost: p.cost,
      stock: p.stock,
      min_stock: p.min_stock,
      saleType: p.sale_type,
      pricePerKilo: p.price_per_kilo,
      created_at: p.created_at,
      updated_at: p.updated_at,
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
      items: saleData.items || [],
      total: saleData.total || 0,
      payment_method: saleData.paymentMethod || 'dinheiro',
      amount_received: saleData.amountReceived || null,
      change: saleData.change || null,
      status: 'completed',
      created_at: new Date().toISOString(),
      transaction_id: saleData.transactionId || null,
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
