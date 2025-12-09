// src/utils/migrateToSupabase.js
import { useAuth } from '../auth/AuthContext';

export function useMigration() {
  const { user, supabase } = useAuth();
  
  // Migrar produtos do localStorage para Supabase
  const migrarProdutos = async () => {
    if (!user) {
      console.log('Usuário não autenticado');
      return { success: false, message: 'Usuário não autenticado' };
    }
    
    try {
      // Carregar produtos do localStorage
      const produtosJson = localStorage.getItem('produtos');
      const produtosLocais = produtosJson ? JSON.parse(produtosJson) : [];
      
      if (!Array.isArray(produtosLocais) || produtosLocais.length === 0) {
        return { success: true, message: 'Nenhum produto local para migrar', count: 0 };
      }
      
      console.log(`Migrando ${produtosLocais.length} produtos...`);
      
      let sucessos = 0;
      let erros = 0;
      
      for (const produto of produtosLocais) {
        try {
          // Converter formato do localStorage para formato do Supabase
          const produtoFormatado = {
            nome: produto.name || produto.nome || 'Produto sem nome',
            descricao: produto.descricao || '',
            preco_custo: parseFloat(produto.cost || produto.preco_custo || 0),
            preco_venda: parseFloat(produto.price || produto.preco_venda || 0),
            quantidade: parseInt(produto.stock || produto.quantidade || 0),
            quantidade_minima: parseInt(produto.min_stock || produto.quantidade_minima || 0),
            codigo_barras: produto.sku || produto.codigo_barras || '',
            user_id: user.id,
            criado_em: produto.created_at || produto.criado_em || new Date().toISOString(),
            atualizado_em: new Date().toISOString()
          };
          
          // Inserir no Supabase
          const { error } = await supabase
            .from('produtos')
            .insert(produtoFormatado);
          
          if (error) {
            console.error(`Erro ao migrar produto "${produtoFormatado.nome}":`, error);
            erros++;
          } else {
            sucessos++;
          }
          
        } catch (err) {
          console.error('Erro no processamento do produto:', err);
          erros++;
        }
      }
      
      // Se migrou com sucesso, limpar localStorage
      if (sucessos > 0) {
        localStorage.removeItem('produtos');
        console.log(`✅ Migração concluída: ${sucessos} produtos migrados, ${erros} erros`);
      }
      
      return {
        success: true,
        message: `Migração concluída: ${sucessos} produtos migrados, ${erros} erros`,
        count: sucessos,
        errors: erros
      };
      
    } catch (error) {
      console.error('Erro geral na migração:', error);
      return {
        success: false,
        message: `Erro na migração: ${error.message}`,
        count: 0
      };
    }
  };
  
  // Migrar todos os dados
  const migrarTodosDados = async () => {
    const resultados = {
      produtos: await migrarProdutos(),
      // Adicionar outras migrações aqui
    };
    
    return resultados;
  };
  
  return {
    migrarProdutos,
    migrarTodosDados
  };
}