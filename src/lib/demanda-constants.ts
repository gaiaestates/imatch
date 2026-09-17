export const ESTADOS = [
  { uf: 'AC', nome: 'Acre' }, { uf: 'AL', nome: 'Alagoas' }, { uf: 'AP', nome: 'Amapá' },
  { uf: 'AM', nome: 'Amazonas' }, { uf: 'BA', nome: 'Bahia' }, { uf: 'CE', nome: 'Ceará' },
  { uf: 'DF', nome: 'Distrito Federal' }, { uf: 'ES', nome: 'Espírito Santo' }, { uf: 'GO', nome: 'Goiás' },
  { uf: 'MA', nome: 'Maranhão' }, { uf: 'MT', nome: 'Mato Grosso' }, { uf: 'MS', nome: 'Mato Grosso do Sul' },
  { uf: 'MG', nome: 'Minas Gerais' }, { uf: 'PA', nome: 'Pará' }, { uf: 'PB', nome: 'Paraíba' },
  { uf: 'PR', nome: 'Paraná' }, { uf: 'PE', nome: 'Pernambuco' }, { uf: 'PI', nome: 'Piauí' },
  { uf: 'RJ', nome: 'Rio de Janeiro' }, { uf: 'RN', nome: 'Rio Grande do Norte' },
  { uf: 'RS', nome: 'Rio Grande do Sul' }, { uf: 'RO', nome: 'Rondônia' }, { uf: 'RR', nome: 'Roraima' },
  { uf: 'SC', nome: 'Santa Catarina' }, { uf: 'SP', nome: 'São Paulo' },
  { uf: 'SE', nome: 'Sergipe' }, { uf: 'TO', nome: 'Tocantins' },
]

export const TIPOS_IMOVEL: Record<string, string[]> = {
  'Residencial': ['Apartamento', 'Casa', 'Casa em Condomínio', 'Cobertura', 'Studio', 'Kitnet', 'Flat', 'Loft'],
  'Comercial':   ['Sala Comercial', 'Loja', 'Galpão', 'Prédio Comercial', 'Terreno Comercial'],
  'Terreno':     ['Terreno Residencial', 'Terreno Comercial', 'Terreno Rural', 'Chácara', 'Sítio', 'Fazenda'],
}

export const ESTADOS_IMOVEL = ['Lançamento', 'Padrão', 'Para reforma']

export const AMEN_IMOVEL: Record<string, string[]> = {
  'Residencial': [
    'Varanda', 'Varanda gourmet', 'Churrasqueira privativa', 'Piscina privativa',
    'Quintal', 'Jardim privativo', 'Terraço',
    'Ar-condicionado', 'Aquecimento', 'Aquecimento solar', 'Lareira',
    'Armário embutido', 'Armário embutido no quarto', 'Armário na cozinha', 'Armário no banheiro',
    'Closet',
    'Cozinha americana', 'Área de serviço', 'Depósito',
    'Escritório/Home office', 'Interfone', 'Mobiliado', 'TV a cabo',
    'Conexão à internet', 'Aceita animais',
    'Vista para o mar', 'Vista para o lago/rio', 'Vista panorâmica',
    'Automação residencial',
  ],
  'Comercial': [
    'Ar-condicionado', 'Copa', 'Recepção', 'Sala de reunião', 'Depósito',
    'Piso elevado', 'Mezanino', 'Automação', 'Vista para a rua', 'Doca de carga',
    'Interfone', 'TV a cabo', 'Conexão à internet',
  ],
  'Terreno': [
    'Muro', 'Portão eletrônico', 'Área verde', 'Nascente/Rio',
    'Plano', 'Aclive', 'Declive', 'Esquina',
  ],
}

export type AmenCondGrupos = { lazer: string[]; infra: string[]; seguranca: string[] }
export const AMEN_COND_GRUPOS: Record<string, AmenCondGrupos> = {
  'Residencial': {
    lazer: [
      'Academia', 'Churrasqueira', 'Espaço gourmet', 'Espaço verde/Parque',
      'Jardim', 'Piscina', 'Playground', 'Quadra de tênis', 'Quadra poliesportiva',
      'Salão de festas', 'Salão de jogos', 'Sauna', 'Spa',
      'Rooftop', 'Espaço pet', 'Brinquedoteca', 'Quadra de padel', 'Quadra de squash',
    ],
    infra: [
      'Acesso para deficientes', 'Bicicletário', 'Coworking', 'Elevador',
      'Garagem', 'Vaga coberta', 'Vaga de visitante', 'Gerador elétrico',
      'Lavanderia', 'Recepção', 'Depósito/Box',
    ],
    seguranca: [
      'Portaria 24h', 'Portaria virtual', 'Condomínio fechado',
      'Portão eletrônico', 'Circuito de segurança (CFTV)', 'Sistema de alarme',
    ],
  },
  'Comercial': {
    lazer: [],
    infra: [
      'Portaria 24h', 'Elevador', 'Gerador', 'Estacionamento', 'Coworking',
      'Auditório', 'Restaurante no prédio', 'Bicicletário', 'Acesso para deficientes',
    ],
    seguranca: ['Portaria 24h', 'Circuito de segurança (CFTV)', 'Condomínio fechado'],
  },
  'Terreno': { lazer: [], infra: [], seguranca: [] },
}

export const AMEN_COND: Record<string, string[]> = {
  'Residencial': [
    ...AMEN_COND_GRUPOS['Residencial'].lazer,
    ...AMEN_COND_GRUPOS['Residencial'].infra,
    ...AMEN_COND_GRUPOS['Residencial'].seguranca,
  ],
  'Comercial': [
    ...AMEN_COND_GRUPOS['Comercial'].infra,
    ...AMEN_COND_GRUPOS['Comercial'].seguranca,
  ],
  'Terreno': [],
}

export const IS_CONDO_TIPO = [
  'Apartamento', 'Cobertura', 'Studio', 'Kitnet', 'Flat', 'Loft',
  'Casa em Condomínio', 'Sala Comercial', 'Loja', 'Prédio Comercial',
]

export function getTipoCategoria(tipo: string): string {
  for (const [cat, lista] of Object.entries(TIPOS_IMOVEL)) {
    if (lista.includes(tipo)) return cat
  }
  return 'Residencial'
}

export type Prio = 'pref' | 'req' | null
export function nextPrio(p: Prio): Prio { return p === null ? 'pref' : p === 'pref' ? 'req' : null }

export function formatBRL(raw: string) { return raw.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.') }
export function parseBRL(v: string) { return v.replace(/\./g, '') }

export function parseObservacoes(raw: string | null) {
  if (!raw) return { prazoDef: true, prazoValor: '3', prazoUnidade: 'meses' as const, obs: '' }
  const parts = raw.split(' | ')
  const first = parts[0]
  const rest = parts.slice(1).join(' | ')
  const prazoMatch = first.match(/^Prazo: (\d+) (meses|anos)$/)
  if (prazoMatch) return { prazoDef: false, prazoValor: prazoMatch[1], prazoUnidade: prazoMatch[2] as 'meses' | 'anos', obs: rest }
  if (first === 'Sem prazo definido') return { prazoDef: true, prazoValor: '3', prazoUnidade: 'meses' as const, obs: rest }
  return { prazoDef: true, prazoValor: '3', prazoUnidade: 'meses' as const, obs: raw }
}
