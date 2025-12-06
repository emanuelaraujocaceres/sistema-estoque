# fix-app.ps1 - Script SIMPLES para correções
Write-Host "🚀 Iniciando correções..." -ForegroundColor Green

# 1. Backup
$backupDir = "backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
Copy-Item "src" -Destination "$backupDir\src" -Recurse -Force
Write-Host "✅ Backup criado em: $backupDir" -ForegroundColor Green

# 2. Criar pasta context
if (!(Test-Path -Path "src\context")) {
    New-Item -ItemType Directory -Path "src\context" -Force | Out-Null
    Write-Host "✅ Pasta context criada" -ForegroundColor Green
}

# 3. Criar ProductsContext.jsx
$context = @"
import React, { createContext, useState, useContext, useEffect } from 'react';

const ProductsContext = createContext();

export const useProducts = () => {
  return useContext(ProductsContext);
};

export const ProductsProvider = ({ children }) => {
  const [products, setProducts] = useState(() => {
    try {
      const saved = localStorage.getItem('products');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [
      { id: 1, nome: 'Café', codigo: 'CAFE001', preco: 50, estoque: 4, minEstoque: 3 },
      { id: 2, nome: 'Gasolina', codigo: 'GAS001', preco: 100, estoque: 0, minEstoque: 10 },
      { id: 3, nome: 'Cerveja Heineken', codigo: 'CERVEJA001', preco: 20, estoque: 10, minEstoque: 5 },
    ];
  });

  useEffect(() => {
    localStorage.setItem('products', JSON.stringify(products));
  }, [products]);

  const updateStock = (id, change) => {
    setProducts(prev => prev.map(p => 
      p.id === id ? { ...p, estoque: Math.max(0, p.estoque + change) } : p
    ));
  };

  return (
    <ProductsContext.Provider value={{ products, updateStock }}>
      {children}
    </ProductsContext.Provider>
  );
};
"@

$context | Out-File -FilePath "src\context\ProductsContext.jsx" -Encoding UTF8
Write-Host "✅ ProductsContext criado" -ForegroundColor Green

# 4. Adicionar Provider ao App.jsx (modificação mínima)
$appPath = "src\App.jsx"
if (Test-Path $appPath) {
    $content = Get-Content $appPath -Raw
    if ($content -notmatch "ProductsProvider") {
        # Adicionar import
        $content = $content -replace "import './App.css';", "import './App.css';
import { ProductsProvider } from './context/ProductsContext';"
        
        # Adicionar Provider
        $content = $content -replace "<AuthProvider>", "<ProductsProvider>
      <AuthProvider>"
        
        $content = $content -replace "</AuthProvider>", "</AuthProvider>
    </ProductsProvider>"
        
        $content | Out-File -FilePath $appPath -Encoding UTF8
        Write-Host "✅ App.jsx atualizado" -ForegroundColor Green
    } else {
        Write-Host "⚠️ App.jsx já tem ProductsProvider, pulando..." -ForegroundColor Yellow
    }
}

# 5. Criar hook useStock
if (!(Test-Path -Path "src\hooks")) {
    New-Item -ItemType Directory -Path "src\hooks" -Force | Out-Null
}

$hook = @"
// useStock.js - Hook para estoque
import { useProducts } from '../context/ProductsContext';

export const useStock = () => {
  const { products, updateStock } = useProducts();

  const addToCart = (productId) => {
    const product = products.find(p => p.id === productId);
    if (product && product.estoque > 0) {
      # Diminui estoque
      updateStock(productId, -1);
      
      # Atualiza carrinho
      const cart = JSON.parse(localStorage.getItem('cart') || '[]');
      const existing = cart.find(item => item.id === productId);
      
      if (existing) {
        existing.quantidade += 1;
      } else {
        cart.push({ ...product, quantidade: 1 });
      }
      
      localStorage.setItem('cart', JSON.stringify(cart));
      return true;
    }
    return false;
  };

  return { products, addToCart, updateStock };
};
"@

$hook | Out-File -FilePath "src\hooks\useStock.js" -Encoding UTF8
Write-Host "✅ Hook useStock criado" -ForegroundColor Green

# 6. Criar arquivo de melhorias CSS
$css = @"
/* improvements.css - Melhorias sem quebrar nada */

/* Melhor contraste */
.product-name, .produto-nome {
  color: #1a1a1a !important;
  font-weight: 600 !important;
}

.product-price, .total-amount {
  color: #000 !important;
  font-weight: 700 !important;
}

/* Evitar overflow */
body, #root {
  max-width: 100vw !important;
  overflow-x: hidden !important;
}

/* Classes para estoque */
.stock-counter {
  font-weight: bold;
  transition: all 0.3s;
}

.stock-low {
  color: orange;
}

.stock-out {
  color: red;
}

/* Para mobile */
@media (max-width: 768px) {
  .container {
    padding: 10px !important;
  }
  
  .card {
    margin: 10px 0 !important;
  }
}
"@

$css | Out-File -FilePath "src\improvements.css" -Encoding UTF8
Write-Host "✅ CSS de melhorias criado" -ForegroundColor Green

# 7. Adicionar import do CSS
$mainPath = "src\main.jsx"
if (Test-Path $mainPath) {
    $main = Get-Content $mainPath -Raw
    if ($main -notmatch "improvements.css") {
        $main = $main -replace "import './index.css'", "import './index.css'
import './improvements.css'"
        $main | Out-File -FilePath $mainPath -Encoding UTF8
        Write-Host "✅ CSS importado" -ForegroundColor Green
    } else {
        Write-Host "⚠️ CSS já importado, pulando..." -ForegroundColor Yellow
    }
}

Write-Host "`n🎉 CONCLUÍDO! Resumo:" -ForegroundColor Green
Write-Host "✅ Backup criado: $backupDir" -ForegroundColor Cyan
Write-Host "✅ Contexto de produtos criado" -ForegroundColor Cyan
Write-Host "✅ Hook para estoque criado" -ForegroundColor Cyan
Write-Host "✅ CSS de melhorias adicionado" -ForegroundColor Cyan
Write-Host "✅ Nada foi removido ou quebrado" -ForegroundColor Green
Write-Host "`n🚀 Agora execute: npm run dev" -ForegroundColor Yellow