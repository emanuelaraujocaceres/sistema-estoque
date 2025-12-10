import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'

// Configuração do cliente OpenAI via Vercel AI Gateway
const aiClient = openai('gpt-4-turbo', {
    apiKey: import.meta.env.VITE_VERCEL_AI_GATEWAY_API_KEY,
    // Remova a baseURL se não estiver usando gateway específico
    // baseURL: 'https://gateway.ai.cloudflare.com/v1/...'
})

export async function generateProductDescription(productName: string, category: string) {
    try {
        console.log('🔄 Gerando descrição para:', productName)
        
        const { text } = await generateText({
            model: aiClient,
            prompt: \Crie uma descrição de produto persuasiva em português do Brasil.

Nome do produto: \
Categoria: \

A descrição deve:
1. Ser atrativa e convincente (50-80 palavras)
2. Destacar 3-5 benefícios principais
3. Incluir palavras-chave para SEO
4. Terminar com um call-to-action

Descrição:\,
            temperature: 0.7,
            maxTokens: 500,
        })

        console.log('✅ Descrição gerada com sucesso!')
        return text
        
    } catch (error) {
        console.error('❌ Erro ao gerar descrição:', error)
        return \Descrição para \ - Um produto excelente na categoria \ que oferece qualidade e satisfação garantida.\
    }
}

export async function analyzeSalesTrend(salesData: any[]) {
    try {
        console.log('📊 Analisando tendências de vendas...')
        
        const { text } = await generateText({
            model: aiClient,
            prompt: \Analise estes dados de vendas e forneça insights:

Dados: \

Forneça:
1. Produtos mais vendidos
2. Sugestões de promoções ou combos
3. Horários/dias de pico de vendas
4. Recomendações para aumentar vendas

Análise em português:\,
            temperature: 0.5,
            maxTokens: 800,
        })

        console.log('✅ Análise concluída!')
        return text
        
    } catch (error) {
        console.error('❌ Erro na análise:', error)
        return 'Análise temporariamente indisponível.'
    }
}

export async function suggestProductName(features: string[], category: string) {
    try {
        console.log('💡 Sugerindo nome de produto...')
        
        const { text } = await generateText({
            model: aiClient,
            prompt: \Sugira 5 nomes criativos para um produto com estas características:

Características: \
Categoria: \

Regras:
1. Nomes em português do Brasil
2. Curtos e memoráveis (2-4 palavras)
3. Relacionados às características
4. Disponível para registro de marca

Sugestões (formato: 1. Nome - Breve explicação):\,
            temperature: 0.8,
            maxTokens: 400,
        })

        console.log('✅ Nomes sugeridos!')
        return text
        
    } catch (error) {
        console.error('❌ Erro ao sugerir nomes:', error)
        return \1. Produto \ Premium - Oferece \\
    }
}
