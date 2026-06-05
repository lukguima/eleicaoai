import type { AssetType } from '@/types'

export interface ServiceMeta {
  type: AssetType
  label: string
  description: string
  format: string
  deliveryTime: string
  price: number        // em centavos
  icon: string
  highlights: string[]
}

export const SERVICES: Record<AssetType, ServiceMeta> = {
  santinho: {
    type: 'santinho',
    label: 'Santinho',
    description: 'Material impresso padrão de campanha, pronto para gráfica.',
    format: '70 × 100 mm · 300 dpi',
    deliveryTime: 'Pronto em até 2 minutos',
    price: 2900,
    icon: '🗳️',
    highlights: ['Frente com foto e número', 'Cores da campanha', 'Rótulo TSE automático'],
  },
  banner: {
    type: 'banner',
    label: 'Banner',
    description: 'Banner vertical para fachada, evento ou stand de campanha.',
    format: '80 × 120 cm · 150 dpi',
    deliveryTime: 'Pronto em até 2 minutos',
    price: 2900,
    icon: '📢',
    highlights: ['Alta resolução para impressão', 'Layout profissional', 'Pronto para gráfica'],
  },
  perfurado: {
    type: 'perfurado',
    label: 'Faixa Perfurada',
    description: 'Faixa horizontal para fachadas, muros e espaços abertos.',
    format: '100 × 40 cm · 150 dpi',
    deliveryTime: 'Pronto em até 2 minutos',
    price: 3900,
    icon: '🏷️',
    highlights: ['Formato wide horizontal', 'Otimizado para leitura à distância', 'Cores vibrantes'],
  },
  social: {
    type: 'social',
    label: 'Post para Redes Sociais',
    description: 'Imagem quadrada para Instagram, Facebook e WhatsApp.',
    format: '1080 × 1080 px · 72 dpi',
    deliveryTime: 'Pronto em até 2 minutos',
    price: 1900,
    icon: '📱',
    highlights: ['Formato 1:1 universal', 'Pronto para publicar', 'Alta qualidade visual'],
  },
  jingle: {
    type: 'jingle',
    label: 'Jingle de Campanha',
    description: 'Música original com letra personalizada gerada por IA.',
    format: 'MP3 · ~2 minutos',
    deliveryTime: 'Pronto em até 5 minutos',
    price: 4900,
    icon: '🎵',
    highlights: ['Letra baseada na sua biografia', '6 estilos musicais', 'Aviso legal de IA incluído'],
  },
}

export function formatPrice(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function getService(type: string): ServiceMeta | null {
  return SERVICES[type as AssetType] ?? null
}
