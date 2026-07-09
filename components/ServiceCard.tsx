import Link from 'next/link'
import { formatPrice, type ServiceMeta } from '@/lib/pricing'

interface Props {
  service: ServiceMeta
  featured?: boolean
}

export default function ServiceCard({ service, featured = false }: Props) {
  return (
    <div
      className={`relative flex flex-col rounded-2xl border bg-white shadow-sm hover:shadow-md transition-shadow overflow-hidden ${
        featured ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-gray-200'
      }`}
    >
      {featured && (
        <div className="bg-blue-600 text-white text-[10px] font-bold uppercase tracking-widest text-center py-1">
          Mais popular
        </div>
      )}

      <div className="p-6 flex flex-col flex-1 gap-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="text-3xl">{service.icon}</span>
            <h3 className="text-lg font-bold text-gray-900 mt-2">{service.label}</h3>
            <p className="text-sm text-gray-500 mt-1 leading-relaxed">{service.description}</p>
          </div>
        </div>

        {/* Highlights */}
        <ul className="space-y-1.5 flex-1">
          {service.highlights.map((h) => (
            <li key={h} className="flex items-center gap-2 text-sm text-gray-600">
              <span className="text-green-500 font-bold flex-shrink-0">✓</span>
              {h}
            </li>
          ))}
        </ul>

        {/* Meta */}
        <div className="border-t border-gray-100 pt-4 space-y-1">
          <p className="text-xs text-gray-400">{service.format}</p>
          <p className="text-xs text-gray-400">⏱ {service.deliveryTime}</p>
        </div>

        {/* Price + CTA */}
        <div className="flex items-center justify-between mt-2">
          <div>
            <span className="text-2xl font-extrabold text-gray-900">
              {formatPrice(service.price)}
            </span>
            <span className="text-xs text-gray-400 ml-1">/ peça</span>
          </div>
          <Link
            href={"/planos"}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-colors ${
              featured
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gray-900 hover:bg-gray-700 text-white'
            }`}
          >
            Solicitar
          </Link>
        </div>
      </div>
    </div>
  )
}
