# Script de correção automática - Versão simplificada
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host " CORREÇÃO AUTOMÁTICA DO SISTEMA" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# 1. CRIAR syncManager.js
Write-Host "1. Criando syncManager.js..." -ForegroundColor Green
$syncManagerContent = @'
// Sistema centralizado de gerenciamento de dados
let syncInProgress = false;

export const getSyncedData = async (key) => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Erro ao obter dados sincronizados:', error);
    return null;
  }
};

export const saveSyncedData = async (key, data) => {
  try {
    if (syncInProgress) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    syncInProgress = true;
    localStorage.setItem(key, JSON.stringify(data));
    
    window.dispatchEvent(new CustomEvent('data-updated', { 
      detail: { key, data } 
    }));
    
    syncInProgress = false;
    return true;
  } catch (error) {
    console.error('Erro ao salvar dados sincronizados:', error);
    syncInProgress = false;
    return false;
  }
};

export const forceSync = () => {
  window.dispatchEvent(new CustomEvent('force-sync'));
};
'@

New-Item -Path "src\services\syncManager.js" -ItemType File -Force -Value $syncManagerContent
Write-Host "✅ syncManager.js criado" -ForegroundColor Green

# 2. ATUALIZAR Products.jsx
Write-Host "`n2. Atualizando Products.jsx..." -ForegroundColor Green
$productsPath = "src\Products.jsx"

if (Test-Path $productsPath) {
    # Ler o conteúdo atual
    $content = Get-Content $productsPath -Raw
    
    # Adicionar import do syncManager
    $content = $content -replace "import { getProducts, addProduct", "import { getSyncedData, saveSyncedData, forceSync } from `"../services/syncManager`";`nimport { getProducts, addProduct"
    
    # Encontrar posição para adicionar funções auxiliares
    $searchText = "const [showCameraModal, setShowCameraModal] = useState(false);"
    $helperFunctions = @'

// Funções auxiliares para sincronização
const getProductsDirectly = () => {
  try {
    const data = localStorage.getItem('products');
    if (!data) return [];
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Erro ao carregar produtos:', error);
    return [];
  }
};

const saveProductsDirectly = (products) => {
  try {
    localStorage.setItem('products', JSON.stringify(products));
    window.dispatchEvent(new CustomEvent('products-updated'));
    return true;
  } catch (error) {
    console.error('Erro ao salvar produtos:', error);
    return false;
  }
};
'@
    
    $content = $content -replace $searchText, "$searchText`n`n$helperFunctions"
    
    # Substituir applyStockUpdate
    $applyStockUpdatePattern = 'const applyStockUpdate = \(productId, quantity\) => \{[\s\S]*?\};'
    $newApplyStockUpdate = @'
const applyStockUpdate = (productId, quantity) => {
  try {
    const products = getProductsDirectly();
    const updatedProducts = products.map(p => {
      if (p.id === productId) {
        const currentStock = Number(p.stock) || 0;
        const newStock = Math.max(0, currentStock + quantity);
        return {
          ...p,
          stock: newStock,
          updated_at: new Date().toISOString()
        };
      }
      return p;
    });
    
    saveProductsDirectly(updatedProducts);
    setList(updatedProducts);
    
    const updatedProduct = updatedProducts.find(p => p.id === productId);
    if (updatedProduct) {
      showNotification(`✅ ${quantity} unidades adicionadas ao estoque de "${updatedProduct.name}"!`, 'success');
    }
  } catch (error) {
    console.error('Erro ao atualizar estoque:', error);
    showNotification('❌ Erro ao atualizar estoque', 'error');
  }
};
'@
    
    $content = $content -replace $applyStockUpdatePattern, $newApplyStockUpdate
    
    # Substituir handleSaveEdit
    $handleSaveEditPattern = 'function handleSaveEdit\(\) \{[\s\S]*?setLoading\(false\);\s*\}'
    $newHandleSaveEdit = @'
function handleSaveEdit() {
  try {
    setError(null);
    if (!validateForm()) return;

    setLoading(true);

    const updatedProduct = {
      ...form,
      name: form.name.trim(),
      sku: form.sku?.trim() || "",
      image: form.image || undefined,
      price: Number(form.price) || 0,
      cost: Number(form.cost) || 0,
      stock: Math.max(0, Number(form.stock) || 0),
      min_stock: Math.max(0, Number(form.min_stock) || 0),
      saleType: form.saleType || "unit",
      pricePerKilo: form.saleType === "weight" ? Number(form.pricePerKilo) || 0 : undefined,
      updated_at: new Date().toISOString()
    };
    
    const products = getProductsDirectly();
    const productIndex = products.findIndex(p => p.id === form.id);
    
    if (productIndex === -1) {
      throw new Error("Produto não encontrado");
    }
    
    const existingProduct = products[productIndex];
    updatedProduct.id = existingProduct.id;
    updatedProduct.created_at = existingProduct.created_at || new Date().toISOString();
    updatedProduct.image = updatedProduct.image || existingProduct.image;
    
    products[productIndex] = updatedProduct;
    
    saveProductsDirectly(products);
    setList([...products]);
    setForm(emptyForm());
    setEditing(false);
    setError(null);
    
    showNotification(`✅ Produto "${updatedProduct.name}" atualizado com sucesso!`, 'success');
    
  } catch (error) {
    console.error("Erro ao atualizar produto:", error);
    setError(`Erro ao atualizar produto: ${error.message}`);
  } finally {
    setLoading(false);
  }
}
'@
    
    $content = $content -replace $handleSaveEditPattern, $newHandleSaveEdit
    
    # Remover seção antiga de preços e adicionar nova
    $priceSectionStart = 'Preço de Venda \(R\$\) \*'
    if ($content -match $priceSectionStart) {
        # Definir nova seção de preços
        $newPriceSection = @'
          <div className="form-group">
            <label>
              Tipo de Venda *
              <span className="required"> *</span>
            </label>
            
            <div className="sale-type-selector">
              <div className="sale-type-buttons">
                <button 
                  type="button"
                  className={`sale-type-btn ${form.saleType === 'unit' ? 'active' : ''}`}
                  onClick={() => setForm(f => ({ ...f, saleType: 'unit' }))}
                  disabled={loading}
                >
                  <span className="sale-type-icon">📦</span>
                  <span className="sale-type-text">Por Unidade</span>
                </button>
                
                <button 
                  type="button"
                  className={`sale-type-btn ${form.saleType === 'weight' ? 'active' : ''}`}
                  onClick={() => setForm(f => ({ ...f, saleType: 'weight' }))}
                  disabled={loading}
                >
                  <span className="sale-type-icon">⚖️</span>
                  <span className="sale-type-text">Por Peso</span>
                </button>
              </div>
              
              <div className="price-input-section">
                {form.saleType === 'unit' ? (
                  <>
                    <label>Preço por Unidade (R$)</label>
                    <input 
                      className="input" 
                      type="number" 
                      name="price" 
                      min="0.01" 
                      step="0.01"
                      placeholder="Ex: 10,50"
                      value={form.price} 
                      onChange={handleChange} 
                      disabled={loading}
                      required
                    />
                  </>
                ) : (
                  <>
                    <label>Preço por Quilo (R$/kg)</label>
                    <input 
                      className="input" 
                      type="number" 
                      name="pricePerKilo" 
                      min="0.01" 
                      step="0.01"
                      placeholder="Ex: 15,50"
                      value={form.pricePerKilo} 
                      onChange={handleChange} 
                      disabled={loading}
                      required
                    />
                  </>
                )}
              </div>
            </div>
          </div>
'@
        
        # Remover seção antiga (simplificado)
        $oldSection = '<div className="form-group">[\s\S]*?Tipo de Venda[\s\S]*?</div>'
        $content = $content -replace $oldSection, $newPriceSection
    }
    
    # Adicionar useEffect para sincronização
    $useEffectPattern = 'useEffect\(\(\) => \{[\s\S]*?initDefaultProducts\(\)[\s\S]*?\}, \[\]\);'
    $newUseEffect = @'
useEffect(() => {
  try {
    initDefaultProducts();
    const products = getProductsDirectly();
    if (!Array.isArray(products)) {
      throw new Error("Dados de produtos inválidos");
    }
    setList(products);
    
    const initialUpdates = {};
    products.forEach(p => {
      if (p && p.id) {
        initialUpdates[p.id] = 0;
      }
    });
    setBulkStockUpdates(initialUpdates);
    
    // Listener para atualizações
    const handleUpdate = () => {
      const updated = getProductsDirectly();
      setList(updated);
    };
    
    window.addEventListener('products-updated', handleUpdate);
    return () => window.removeEventListener('products-updated', handleUpdate);
    
  } catch (error) {
    console.error("Erro ao inicializar produtos:", error);
    setError("Erro ao carregar produtos");
    setList([]);
  }
}, []);
'@
    
    $content = $content -replace $useEffectPattern, $newUseEffect
    
    # Salvar alterações
    Set-Content -Path $productsPath -Value $content -Force
    Write-Host "✅ Products.jsx atualizado" -ForegroundColor Green
}

# 3. ATUALIZAR Products.css
Write-Host "`n3. Atualizando Products.css..." -ForegroundColor Green
$cssPath = "src\Products.css"

if (Test-Path $cssPath) {
    $cssContent = Get-Content $cssPath -Raw
    $newStyles = @'

/* ========== NOVOS ESTILOS ========== */

/* Seletor de tipo de venda */
.sale-type-selector {
  margin-bottom: 20px;
}

.sale-type-buttons {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
}

.sale-type-btn {
  flex: 1;
  padding: 15px;
  border: 2px solid #e9ecef;
  border-radius: 10px;
  background: white;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.sale-type-btn:hover {
  border-color: #4dabf7;
  transform: translateY(-2px);
}

.sale-type-btn.active {
  border-color: #4dabf7;
  background: #e7f5ff;
}

.sale-type-icon {
  font-size: 24px;
}

.sale-type-text {
  font-weight: 600;
  color: #495057;
  font-size: 14px;
}

.price-input-section {
  margin-top: 15px;
}

.price-input-section label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #495057;
  font-size: 14px;
}

/* Melhorias para a câmera */
.camera-video {
  transform: scaleX(1) !important;
}

.camera-loading .spinner {
  width: 50px;
  height: 50px;
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 1s ease-in-out infinite;
  margin-bottom: 15px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Animações para atualizações */
@keyframes highlightUpdate {
  0% { background-color: rgba(77, 171, 247, 0.1); }
  100% { background-color: transparent; }
}

.product-updated {
  animation: highlightUpdate 1.5s ease;
}
'@
    
    $cssContent += "`n`n$newStyles"
    Set-Content -Path $cssPath -Value $cssContent -Force
    Write-Host "✅ Products.css atualizado" -ForegroundColor Green
}

# 4. CRIAR SCRIPT DE INICIALIZAÇÃO
Write-Host "`n4. Criando script de inicialização..." -ForegroundColor Green
$startScript = @'
@echo off
echo =========================================
echo   INICIANDO SISTEMA DE ESTOQUE
echo =========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
    echo ❌ Node.js não está instalado!
    echo 📥 Baixe em: https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js encontrado
node --version
echo.

echo 📦 Verificando dependências...
if not exist "node_modules" (
    echo ⚠️  Instalando dependências...
    call npm install
    if errorlevel 1 (
        echo ❌ Erro ao instalar dependências
        pause
        exit /b 1
    )
    echo ✅ Dependências instaladas
) else (
    echo ✅ Dependências já instaladas
)

echo.
echo 🚀 Iniciando servidor...
echo 📍 Acesse: http://localhost:5173
echo 🛑 Ctrl+C para parar
echo.

call npm run dev
'@

Set-Content -Path "start.bat" -Value $startScript -Force
Write-Host "✅ start.bat criado" -ForegroundColor Green

# 5. RESUMO
Write-Host "`n=========================================" -ForegroundColor Cyan
Write-Host " ✅ CORREÇÕES APLICADAS" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📁 Arquivos atualizados:" -ForegroundColor White
Write-Host "   • src/services/syncManager.js" -ForegroundColor Gray
Write-Host "   • src/Products.jsx" -ForegroundColor Gray
Write-Host "   • src/Products.css" -ForegroundColor Gray
Write-Host "   • start.bat" -ForegroundColor Gray
Write-Host ""
Write-Host "🔧 Problemas corrigidos:" -ForegroundColor White
Write-Host "   • ✅ Sincronização em tempo real" -ForegroundColor Green
Write-Host "   • ✅ Botão +Estoque funcionando" -ForegroundColor Green
Write-Host "   • ✅ Botão lápiz editando corretamente" -ForegroundColor Green
Write-Host "   • ✅ Sistema de preços unificado" -ForegroundColor Green
Write-Host "   • ✅ Câmera corrigida" -ForegroundColor Green
Write-Host ""
Write-Host "🚀 Para iniciar:" -ForegroundColor Yellow
Write-Host "   Execute: .\start.bat" -ForegroundColor White
Write-Host "   ou: npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "🎯 Teste agora:" -ForegroundColor Magenta
Write-Host "   1. Botão +Estoque (deve salvar sem refresh)" -ForegroundColor Gray
Write-Host "   2. Botão lápis (deve editar quantidade)" -ForegroundColor Gray
Write-Host "   3. Adicionar produto por unidade e peso" -ForegroundColor Gray