import { useState } from 'react'
import { generateProductDescription, analyzeSalesTrend, suggestProductName } from '../services/ai'

export default function AITest() {
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState('')
    const [productName, setProductName] = useState('')
    const [category, setCategory] = useState('')

    const handleGenerateDescription = async () => {
        if (!productName.trim() || !category.trim()) {
            alert('Preencha nome e categoria do produto')
            return
        }

        setLoading(true)
        setResult('🔄 Gerando descrição...')
        
        try {
            const description = await generateProductDescription(productName, category)
            setResult(\✅ Descrição gerada:\\n\\n\\)
        } catch (error) {
            setResult(\❌ Erro: \\)
        } finally {
            setLoading(false)
        }
    }

    const handleAnalyzeSales = async () => {
        setLoading(true)
        setResult('📊 Analisando vendas...')
        
        try {
            // Simular dados de vendas
            const mockSales = [
                { product: 'Camiseta', quantity: 10, total: 299.90 },
                { product: 'Calça Jeans', quantity: 5, total: 499.50 },
                { product: 'Tênis', quantity: 8, total: 799.20 },
            ]
            
            const analysis = await analyzeSalesTrend(mockSales)
            setResult(\📈 Análise de vendas:\\n\\n\\)
        } catch (error) {
            setResult(\❌ Erro: \\)
        } finally {
            setLoading(false)
        }
    }

    const handleSuggestNames = async () => {
        if (!category.trim()) {
            alert('Informe uma categoria')
            return
        }

        setLoading(true)
        setResult('💡 Sugerindo nomes...')
        
        try {
            const features = ['alta qualidade', 'design moderno', 'preço acessível']
            const names = await suggestProductName(features, category)
            setResult(\🎯 Sugestões de nomes:\\n\\n\\)
        } catch (error) {
            setResult(\❌ Erro: \\)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
            <h1>🧠 Teste de IA</h1>
            
            <div style={{ marginBottom: '20px' }}>
                <h3>Testar geração de descrição</h3>
                <input
                    type="text"
                    placeholder="Nome do produto"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    style={{ marginRight: '10px', padding: '8px' }}
                />
                <input
                    type="text"
                    placeholder="Categoria"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    style={{ marginRight: '10px', padding: '8px' }}
                />
                <button 
                    onClick={handleGenerateDescription}
                    disabled={loading}
                    style={{ padding: '8px 16px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}
                >
                    Gerar Descrição
                </button>
            </div>

            <div style={{ marginBottom: '20px' }}>
                <h3>Outros testes</h3>
                <button 
                    onClick={handleAnalyzeSales}
                    disabled={loading}
                    style={{ marginRight: '10px', padding: '8px 16px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px' }}
                >
                    Analisar Vendas
                </button>
                <button 
                    onClick={handleSuggestNames}
                    disabled={loading}
                    style={{ padding: '8px 16px', backgroundColor: '#6f42c1', color: 'white', border: 'none', borderRadius: '4px' }}
                >
                    Sugerir Nomes
                </button>
            </div>

            {loading && (
                <div style={{ textAlign: 'center', margin: '20px 0' }}>
                    <div style={{ 
                        width: '40px', 
                        height: '40px', 
                        border: '3px solid #f3f3f3',
                        borderTop: '3px solid #007bff',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        margin: '0 auto'
                    }}></div>
                    <style>{\
                        @keyframes spin {
                            0% { transform: rotate(0deg); }
                            100% { transform: rotate(360deg); }
                        }
                    \}</style>
                </div>
            )}

            {result && (
                <div style={{ 
                    marginTop: '20px', 
                    padding: '15px', 
                    backgroundColor: '#f8f9fa', 
                    border: '1px solid #dee2e6',
                    borderRadius: '4px',
                    whiteSpace: 'pre-wrap'
                }}>
                    <h4>Resultado:</h4>
                    <p>{result}</p>
                </div>
            )}

            <div style={{ marginTop: '30px', fontSize: '0.9em', color: '#666' }}>
                <p>🔧 Usando: Vercel AI Gateway + OpenAI GPT-4</p>
                <p>📁 Variáveis carregadas: {import.meta.env.VITE_VERCEL_AI_GATEWAY_API_KEY ? '✅' : '❌'} AI Key</p>
            </div>
        </div>
    )
}
