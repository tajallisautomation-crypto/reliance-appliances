'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { trackFAQExpand } from '@/lib/analytics'

export interface FAQItem {
  question: string
  answer: string
}

interface Props {
  items: FAQItem[]
  title?: string
  /** Emit FAQPage JSON-LD schema into a <script> tag. Default true. */
  schema?: boolean
  className?: string
}

export default function FAQSection({ items, title = 'Frequently Asked Questions', schema = true, className = '' }: Props) {
  const [open, setOpen] = useState<number | null>(null)

  const toggle = (i: number) => {
    if (open !== i) trackFAQExpand(items[i].question)
    setOpen(prev => (prev === i ? null : i))
  }

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map(({ question, answer }) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: { '@type': 'Answer', text: answer },
    })),
  }

  return (
    <section className={className} aria-label={title}>
      {schema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}

      {title && (
        <h2 className="text-2xl font-black text-gray-900 mb-6">{title}</h2>
      )}

      <div className="divide-y divide-gray-100 border border-gray-100 rounded-2xl overflow-hidden">
        {items.map((item, i) => (
          <div key={i}>
            <button
              onClick={() => toggle(i)}
              aria-expanded={open === i}
              aria-controls={`faq-answer-${i}`}
              className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left bg-white hover:bg-gray-50 transition-colors"
            >
              <span className="font-semibold text-gray-900 text-sm leading-snug">{item.question}</span>
              <ChevronDown
                className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${open === i ? 'rotate-180' : ''}`}
              />
            </button>

            <div
              id={`faq-answer-${i}`}
              role="region"
              aria-labelledby={`faq-btn-${i}`}
              hidden={open !== i}
              className="px-5 pb-4 text-sm text-gray-600 leading-relaxed bg-white"
            >
              {item.answer}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
