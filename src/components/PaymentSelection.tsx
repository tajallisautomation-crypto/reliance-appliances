/**
 * PaymentSelection — checkout payment method fragment.
 * Highlights a 1% discount for Bank Transfer vs Cash on Delivery.
 * Controlled component: parent owns `selectedMethod`.
 *
 * Usage:
 *   <PaymentSelection
 *     amount={cartTotal}
 *     selectedMethod={method}
 *     onSelect={setMethod}
 *   />
 */

import { Banknote, Truck, BadgeCheck, ChevronRight } from 'lucide-react'
import { fmtPKR, roundTo100 } from '../lib/api'

export type PaymentMethod = 'cod' | 'bank_transfer'

interface Props {
  /** Base order amount in PKR */
  amount: number
  selectedMethod: PaymentMethod
  onSelect: (method: PaymentMethod) => void
}

const BANK_DISCOUNT_RATE = 0.01 // 1%

export function getDiscountedAmount(amount: number): number {
  return roundTo100(amount * (1 - BANK_DISCOUNT_RATE))
}

export default function PaymentSelection({ amount, selectedMethod, onSelect }: Props) {
  const discount     = roundTo100(amount * BANK_DISCOUNT_RATE)
  const finalAmount  = amount - discount

  return (
    <div className="space-y-3">

      {/* ── Option 1: Cash on Delivery ───────────────────────────────────── */}
      <button
        type="button"
        onClick={() => onSelect('cod')}
        className={`w-full text-left rounded-2xl border-2 p-4 transition-all active:scale-[.99] ${
          selectedMethod === 'cod'
            ? 'border-brand-400 bg-brand-50 shadow-brand'
            : 'border-gray-200 bg-white hover:border-gray-300'
        }`}
      >
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
            selectedMethod === 'cod' ? 'bg-brand-100' : 'bg-gray-100'
          }`}>
            <Truck className={`w-5 h-5 ${selectedMethod === 'cod' ? 'text-brand-600' : 'text-gray-400'}`} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-bold text-gray-900 text-sm">Cash on Delivery</p>
              {selectedMethod === 'cod' && (
                <BadgeCheck className="w-4 h-4 text-brand-500 flex-shrink-0" />
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">Pay when your order arrives</p>
          </div>

          {/* Amount */}
          <div className="text-right flex-shrink-0">
            <p className="font-black text-gray-900 text-base">{fmtPKR(amount)}</p>
          </div>
        </div>

        {/* Radio indicator */}
        <div className="flex items-center gap-2 mt-3 ml-14">
          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
            selectedMethod === 'cod'
              ? 'border-brand-500'
              : 'border-gray-300'
          }`}>
            {selectedMethod === 'cod' && (
              <div className="w-2 h-2 bg-brand-500 rounded-full" />
            )}
          </div>
          <p className="text-xs text-gray-400">Standard delivery · 1-3 business days</p>
        </div>
      </button>

      {/* ── Option 2: Bank Transfer ───────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => onSelect('bank_transfer')}
        className={`w-full text-left rounded-2xl border-2 p-4 transition-all active:scale-[.99] relative overflow-hidden ${
          selectedMethod === 'bank_transfer'
            ? 'border-eco-400 bg-eco-50 shadow-eco'
            : 'border-gray-200 bg-white hover:border-eco-200'
        }`}
      >
        {/* Savings ribbon */}
        <div className="absolute top-0 right-0">
          <div className="bg-eco-500 text-white text-[10px] font-extrabold px-3 py-1 rounded-bl-xl">
            SAVE 1%
          </div>
        </div>

        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
            selectedMethod === 'bank_transfer' ? 'bg-eco-100' : 'bg-gray-100'
          }`}>
            <Banknote className={`w-5 h-5 ${selectedMethod === 'bank_transfer' ? 'text-eco-600' : 'text-gray-400'}`} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-bold text-gray-900 text-sm">Bank Transfer</p>
              {selectedMethod === 'bank_transfer' && (
                <BadgeCheck className="w-4 h-4 text-eco-500 flex-shrink-0" />
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Pay via bank transfer · instant confirmation
            </p>
          </div>

          {/* Amount + savings */}
          <div className="text-right flex-shrink-0 pr-12">
            <p className="font-black text-eco-700 text-base">{fmtPKR(finalAmount)}</p>
            <p className="text-[11px] text-gray-400 line-through">{fmtPKR(amount)}</p>
          </div>
        </div>

        {/* Discount highlight */}
        <div className={`mt-3 mx-0 rounded-xl px-3 py-2 flex items-center justify-between ${
          selectedMethod === 'bank_transfer' ? 'bg-eco-100' : 'bg-gray-100'
        }`}>
          <span className="text-xs font-semibold text-eco-700">
            You save {fmtPKR(discount)}
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-eco-500" />
        </div>

        {/* Radio indicator */}
        <div className="flex items-center gap-2 mt-3 ml-14">
          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
            selectedMethod === 'bank_transfer'
              ? 'border-eco-500'
              : 'border-gray-300'
          }`}>
            {selectedMethod === 'bank_transfer' && (
              <div className="w-2 h-2 bg-eco-500 rounded-full" />
            )}
          </div>
          <p className="text-xs text-gray-400">Bank details shared after order confirmation</p>
        </div>
      </button>

      {/* ── Selected summary ─────────────────────────────────────────────── */}
      <div className={`rounded-xl px-4 py-3 flex items-center justify-between transition-colors ${
        selectedMethod === 'bank_transfer'
          ? 'bg-eco-50 border border-eco-200'
          : 'bg-gray-50 border border-gray-200'
      }`}>
        <p className="text-xs font-semibold text-gray-700">
          {selectedMethod === 'bank_transfer' ? '🎉 Discount Applied' : '📦 Cash on Delivery'}
        </p>
        <p className={`text-sm font-black ${
          selectedMethod === 'bank_transfer' ? 'text-eco-700' : 'text-gray-900'
        }`}>
          {selectedMethod === 'bank_transfer' ? fmtPKR(finalAmount) : fmtPKR(amount)}
        </p>
      </div>
    </div>
  )
}
