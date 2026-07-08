import type { Design } from '@/types'
import type { AssetType } from '@/types'
import { SantinhoTemplate } from './SantinhoTemplate'
import { BannerTemplate } from './BannerTemplate'
import { PerfuradoTemplate } from './PerfuradoTemplate'
import { SocialTemplate } from './SocialTemplate'

// Mapa client-safe (sem dependências de servidor) — usado no preview do editor.
// O servidor usa o mesmo conjunto via lib/render.tsx.
export const TEMPLATE_COMPONENTS: Record<Exclude<AssetType, 'jingle'>, (props: { design: Design }) => React.ReactElement> = {
  santinho: SantinhoTemplate,
  banner: BannerTemplate,
  perfurado: PerfuradoTemplate,
  social: SocialTemplate,
}
