'use client'

import { Check, X, Minus } from 'lucide-react'
import { trackComparisonInteraction } from '@/lib/analytics'
import { useEffect } from 'react'

export interface ComparisonColumn {
  /** Column header — product/plan name */
  name: string
  /** Short tagline shown under the name */
  tagline?: string
  /** Price string e.g. "PKR 85,000" */
  price?: string
  /** If true, visually highlights this column as the recommended pick */
  highlight?: boolean
  /** CTA button label */
  ctaLabel?: string
  /** CTA button href or onClick */
  ctaHref?: string
  ctaOnClick?: () => void
}

export type CellValue = string | boolean | null

export interface ComparisonRow {
  /** Feature label */
  label: string
  /** One value per column — in the same order as `columns` */
  values: CellValue[]
  /** Optional section heading above this row */
  section?: string
}

interface Props {
  title?: string
  columns: ComparisonColumn[]
  rows: ComparisonRow[]
  /** Context label used for analytics (e.g. "AC comparison", "Solar packages") */
  context?: string
  className?: string
}

function Cell({ value }: { value: CellValue }) {
  if (value === true)  return <Check className="w-5 h-5 text-green-500 mx-auto" aria-label="Yes" />
  if (value === false) return <X    className="w-5 h-5 text-red-400  mx-auto" aria-label="No"  />
  if (value === null)  return <Minus className="w-4 h-4 text-gray-300 mx-auto" aria-label="N/A" />
  return <span className="text-sm text-gray-700">{value}</span>
}

export default function ComparisonTable({ title, columns, rows, context = 'comparison', className = '' }: Props) {
  useEffect(() => {
    trackComparisonInteraction(context)
  }, [context])

  const colCount = columns.length

  return (
    <section className={className} aria-label={title || 'Product Comparison'}>
      {title && <h2 className="text-2xl font-black text-gray-900 mb-6">{title}</h2>}

      <div className="overflow-x-auto -mx-4 px-4" role="region" aria-label="Comparison table" data-scroll-region tabIndex={0}>
        <table className="w-full min-w-[36rem] border-collapse text-center">
          <thead>
            <tr>
              {/* Empty corner cell */}
              <th className="w-40 min-w-[8rem]" />
              {columns.map((col, i) => (
                <th key={i} scope="col"
                  className={`pb-4 px-2 ${col.highlight ? 'relative' : ''}`}>
                  {col.highlight && (
                    <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] font-bold bg-brand-500 text-white px-2 py-0.5 rounded-full whitespace-nowrap">
                      Recommended
                    </span>
                  )}
                  <div className={`rounded-2xl px-3 py-3 ${col.highlight ? 'bg-brand-500 text-white' : 'bg-gray-50'}`}>
                    <p className={`font-black text-base leading-tight ${col.highlight ? 'text-white' : 'text-gray-900'}`}>{col.name}</p>
                    {col.tagline && <p className={`text-xs mt-0.5 ${col.highlight ? 'text-brand-200' : 'text-gray-400'}`}>{col.tagline}</p>}
                    {col.price && <p className={`text-sm font-bold mt-1.5 ${col.highlight ? 'text-gold-300' : 'text-brand-600'}`}>{col.price}</p>}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {rows.map((row, ri) => (
              <>
                {row.section && (
                  <tr key={`section-${ri}`}>
                    <td colSpan={colCount + 1}
                      className="pt-5 pb-1 px-2 text-left text-[11px] font-bold uppercase tracking-widest text-gray-400">
                      {row.section}
                    </td>
                  </tr>
                )}
                <tr key={ri} className="hover:bg-gray-50/60 transition-colors">
                  <td className="py-3 px-2 text-left text-sm font-medium text-gray-700 whitespace-nowrap">{row.label}</td>
                  {row.values.map((val, ci) => (
                    <td key={ci} className={`py-3 px-2 ${columns[ci]?.highlight ? 'bg-brand-50/40' : ''}`}>
                      <Cell value={val} />
                    </td>
                  ))}
                </tr>
              </>
            ))}
          </tbody>

          {columns.some(c => c.ctaLabel) && (
            <tfoot>
              <tr>
                <td />
                {columns.map((col, i) => (
                  <td key={i} className="pt-4 pb-2 px-2">
                    {col.ctaLabel && (
                      col.ctaHref ? (
                        <a href={col.ctaHref}
                          className={`inline-flex items-center justify-center w-full py-2.5 px-4 rounded-xl font-bold text-sm transition-colors ${
                            col.highlight
                              ? 'bg-brand-500 hover:bg-brand-600 text-white'
                              : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                          }`}>
                          {col.ctaLabel}
                        </a>
                      ) : (
                        <button onClick={col.ctaOnClick}
                          className={`w-full py-2.5 px-4 rounded-xl font-bold text-sm transition-colors ${
                            col.highlight
                              ? 'bg-brand-500 hover:bg-brand-600 text-white'
                              : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                          }`}>
                          {col.ctaLabel}
                        </button>
                      )
                    )}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </section>
  )
}
