import type { Design } from '@/types'
import type { AssetType } from '@/types'
import { SantinhoTemplate } from './SantinhoTemplate'
import { BannerTemplate } from './BannerTemplate'
import { PerfuradoTemplate } from './PerfuradoTemplate'
import { SocialTemplate } from './SocialTemplate'
import { StoriesTemplate } from './StoriesTemplate'
import { ColinhaTemplate } from './ColinhaTemplate'
import { AdesivoTemplate } from './AdesivoTemplate'
import { CapaTemplate } from './CapaTemplate'

export const TEMPLATE_COMPONENTS: Record<Exclude<AssetType, 'jingle'>, (props: { design: Design }) => React.ReactElement> = {
  santinho: SantinhoTemplate,
  banner: BannerTemplate,
  perfurado: PerfuradoTemplate,
  social: SocialTemplate,
  stories: StoriesTemplate,
  colinha: ColinhaTemplate,
  adesivo: AdesivoTemplate,
  capa: CapaTemplate,
  status: StoriesTemplate,
}
