import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM = `Você é um assistente especializado em extrair características de demandas imobiliárias de textos em português brasileiro.

TIPOS DE IMÓVEL válidos (use exatamente esses nomes):
Residencial: Apartamento, Casa, Casa em Condomínio, Cobertura, Studio, Kitnet, Flat, Loft
Comercial: Sala Comercial, Loja, Galpão, Prédio Comercial, Terreno Comercial
Terreno: Terreno Residencial, Terreno Rural, Chácara, Sítio, Fazenda

ESTADOS (retorne a sigla UF de 2 letras):
AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO

Retorne APENAS um objeto JSON válido, sem markdown, sem explicações.`

const USER_PROMPT = (text: string) => `Analise o texto da demanda imobiliária abaixo e extraia as informações no seguinte formato JSON:

{
  "finalidade": "compra" | "aluguel" | "ambos" | null,
  "tipos_imovel": string[] | null,
  "estado": "SP" | null,
  "cidade": string | null,
  "bairros": string[] | null,
  "quartos_min": number | null,
  "suites_min": number | null,
  "banheiros_min": number | null,
  "vagas_min": number | null,
  "area_min": number | null,
  "area_max": number | null,
  "valor_min": number | null,
  "valor_max": number | null,
  "cond_max": number | null,
  "iptu_max": number | null,
  "observacoes": string | null,
  "unidentified": string[]
}

Regras:
- "finalidade": palavras como comprar/venda/aquisição → "compra"; alugar/locação/aluguel → "aluguel"; ambos se os dois aparecerem
- "tipos_imovel": use apenas os tipos válidos listados, pode ser mais de um
- "valor_min"/"valor_max": converta para número inteiro em reais (ex: "1,5 milhão" → 1500000, "800k" → 800000). IMPORTANTE: se apenas um valor de orçamento/teto/preço for mencionado, coloque-o em "valor_max" e deixe "valor_min" como null. Isso vale tanto para compra quanto para locação.
- "area_min"/"area_max": sempre em m²
- "bairros": liste todos os bairros mencionados
- "unidentified": inclua APENAS os campos críticos não encontrados no texto: "finalidade", "tipos_imovel", "estado", "cidade". Não inclua campos opcionais como quartos, valor, etc.
- "observacoes": coloque informações relevantes que não se encaixam nos outros campos

Texto da demanda:
${text}`

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY não configurada' }, { status: 500 })
  }

  const { text } = await req.json()
  if (!text?.trim()) {
    return NextResponse.json({ error: 'Texto vazio' }, { status: 400 })
  }

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: SYSTEM,
    messages: [{ role: 'user', content: USER_PROMPT(text) }],
  })

  const raw = message.content[0].type === 'text' ? message.content[0].text : ''

  let extracted: Record<string, unknown>
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    extracted = JSON.parse(jsonMatch?.[0] ?? raw)
  } catch {
    return NextResponse.json({ error: 'Resposta inválida da IA' }, { status: 500 })
  }

  return NextResponse.json(extracted)
}
