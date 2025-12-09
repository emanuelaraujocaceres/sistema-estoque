Write-Host "=== REMOVENDO EMOJIS PROBLEMÁTICOS ===" -ForegroundColor Green
Write-Host ""

# 1. Corrigir o arquivo específico do erro
$filePath = "src/screens/Home.jsx"
if (Test-Path $filePath) {
    Write-Host "Corrigindo $filePath..." -ForegroundColor Yellow
    
    # Ler o conteúdo
    $content = Get-Content $filePath -Raw
    
    # Substituir apenas o emoji problemático
    # Procure pela linha com o emoji 🔄
    if ($content -match "🔄") {
        $content = $content -replace "🔄", "⟳"
        Write-Host "  Emoji 🔄 substituído por ⟳" -ForegroundColor Cyan
    }
    
    # Salvar
    $content | Out-File $filePath -Encoding UTF8
    Write-Host "  ✅ Arquivo corrigido" -ForegroundColor Green
} else {
    Write-Host "  ❌ Arquivo não encontrado: $filePath" -ForegroundColor Red
}

# 2. Verificar outros arquivos comuns
Write-Host "`nVerificando outros arquivos..." -ForegroundColor Yellow

$filesToCheck = @(
    "src/App.js",
    "src/screens/Products.js",
    "src/screens/Sales.js",
    "src/screens/Reports.js",
    "src/screens/Login.js"
)

foreach ($file in $filesToCheck) {
    if (Test-Path $file) {
        $content = Get-Content $file -Raw
        
        # Substituir emojis comuns
        $original = $content
        $content = $content -replace "🔄", "⟳"
        $content = $content -replace "✅", "✓"
        $content = $content -replace "❌", "✗"
        $content = $content -replace "⚠️", "⚠"
        
        if ($content -ne $original) {
            $content | Out-File $file -Encoding UTF8
            Write-Host "  ✅ $file corrigido" -ForegroundColor Green
        }
    }
}

# 3. Solução RÁPIDA: Abrir o arquivo para edição manual
Write-Host "`n=== SOLUÇÃO RÁPIDA ===" -ForegroundColor Cyan
Write-Host "Abra o arquivo src/screens/Home.jsx e faça:" -ForegroundColor White
Write-Host "1. Procure pela linha ~351 (onde está o erro)" -ForegroundColor Gray
Write-Host "2. Encontre: 🔄 Reiniciar Câmera" -ForegroundColor Gray
Write-Host "3. Substitua por: ⟳ Reiniciar Câmera" -ForegroundColor Gray
Write-Host "4. Ou por: [Sync] Reiniciar Câmera" -ForegroundColor Gray
Write-Host "5. Salve o arquivo" -ForegroundColor Gray

# 4. Testar o build
Write-Host "`n=== PARA TESTAR ===" -ForegroundColor Cyan
Write-Host "Execute: npm run build" -ForegroundColor White
Write-Host "Se funcionar, faça:" -ForegroundColor White
Write-Host "git add ." -ForegroundColor Gray
Write-Host "git commit -m 'fix: remove emoji'" -ForegroundColor Gray
Write-Host "git push origin main" -ForegroundColor Gray

Write-Host "`n=== PRONTO! ===" -ForegroundColor Green