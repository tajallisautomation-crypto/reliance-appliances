import { useState } from 'react'
import { Shield, ChevronDown, ChevronUp, Check, X, ExternalLink } from 'lucide-react'
import { waSales } from '@/lib/whatsapp'
import type { PortalData, CustomerAppliance, CustomerCarePlan } from './portalTypes'
import { CATEGORY_ICONS, CATEGORY_TO_PLAN_CATEGORY, CARE_PLAN_STARTS, CARE_PLAN_LABELS } from './portalConstants'

const fmtPKR  = (n: number) => 'PKR ' + Math.round(n).toLocaleString('en-PK')
const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000)
}

const PLAN_META = {
  essential: {
    label: 'Essential Care',
    color: 'text-gray-700',
    includes: ['Annual preventive inspection', 'Safety & performance check', 'Cleaning & tune-up'],
    excludes: ['Parts & gas', 'Major repairs', 'Transport', 'Product replacement'],
  },
  plus: {
    label: 'Plus Care',
    color: 'text-amber-600',
    includes: ['All Essential benefits', 'Free maintenance labor', 'Covered parts for eligible faults', 'Priority scheduling'],
    excludes: ['Product replacement'],
  },
  elite: {
    label: 'Elite Care',
    color: 'text-yellow-600',
    includes: ['All Plus benefits', 'Covered repairs & parts', 'Priority handling', 'Product replacement*'],
    excludes: [],
  },
} as const

interface PlanCardProps {
  tier: 'essential' | 'plus' | 'elite'
  price: number
  appliance: CustomerAppliance
  existingPlan?: CustomerCarePlan
}

function PlanCard({ tier, price, appliance, existingPlan }: PlanCardProps) {
  const meta = PLAN_META[tier]
  const isCurrentPlan = existingPlan?.plan_tier === tier
  const isDark = tier === 'plus' || tier === 'elite'

  const action = isCurrentPlan ? 'renew' : existingPlan ? 'upgrade to' : 'subscribe to'
  const waMsg = `Hi, I'd like to *${action}* the *${meta.label}* for my *${appliance.brand} ${appliance.model}*. Please share enrollment details and any pre-inspection requirements.`

  const cardBg    = tier === 'elite' ? 'bg-[#0f0a1a] border-yellow-500' : tier === 'plus' ? 'bg-[#0d1b35] border-amber-400' : 'bg-white border-gray-200'
  const titleClr  = tier === 'elite' ? 'text-yellow-400' : tier === 'plus' ? 'text-amber-400' : 'text-gray-800'
  const priceClr  = isDark ? 'text-white' : 'text-gray-900'
  const unitClr   = isDark ? 'text-gray-400' : 'text-gray-500'
  const itemClr   = isDark ? 'text-gray-300' : 'text-gray-600'
  const exclClr   = isDark ? 'text-gray-500' : 'text-gray-400'
  const checkClr  = tier === 'elite' ? 'text-yellow-400' : tier === 'plus' ? 'text-amber-400' : 'text-green-500'
  const btnCls    = tier === 'elite'
    ? 'bg-yellow-400 text-[#0f0a1a] hover:bg-yellow-300'
    : tier === 'plus'
    ? 'bg-amber-400 text-[#0d1b35] hover:bg-amber-300'
    : 'bg-gray-900 text-white hover:bg-gray-800'

  return (
    <div className={`rounded-xl border ${cardBg} p-4 flex flex-col gap-3`}>
      <div className="flex items-center justify-between">
        <span className={`text-sm font-bold ${titleClr}`}>{meta.label}</span>
        {isCurrentPlan && (
          <span className="text-xs font-semibold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Current</span>
        )}
      </div>

      <p className={`text-lg font-black ${priceClr}`}>
        {fmtPKR(price)}<span className={`text-xs font-normal ml-0.5 ${unitClr}`}>/year</span>
      </p>

      <ul className="space-y-1 flex-1">
        {meta.includes.map(item => (
          <li key={item} className={`flex items-start gap-1.5 text-xs ${itemClr}`}>
            <Check className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${checkClr}`} />
            {item}
          </li>
        ))}
        {meta.excludes.map(item => (
          <li key={item} className={`flex items-start gap-1.5 text-xs ${exclClr}`}>
            <X className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-red-400" />
            {item}
          </li>
        ))}
      </ul>

      <a href={waSales(waMsg)} target="_blank" rel="noopener noreferrer"
        className={`w-full text-center text-xs font-bold py-2.5 rounded-lg transition-colors ${btnCls}`}>
        {isCurrentPlan ? 'Renew Plan' : existingPlan ? `Upgrade to ${meta.label}` : `Get ${meta.label}`}
      </a>
    </div>
  )
}

interface AppliancePlanRowProps {
  appliance: CustomerAppliance
  plan: CustomerCarePlan | undefined
  defaultOpen?: boolean
}

function AppliancePlanRow({ appliance, plan, defaultOpen = false }: AppliancePlanRowProps) {
  const [expanded, setExpanded] = useState(defaultOpen)
  const icon = CATEGORY_ICONS[appliance.category] ?? '🔌'
  const planCategory = CATEGORY_TO_PLAN_CATEGORY[appliance.category]
  const starts = planCategory ? CARE_PLAN_STARTS[planCategory] : null

  const planLabel = plan ? CARE_PLAN_LABELS[plan.status] : null
  const isActive  = plan && ['active', 'expiring_soon'].includes(plan.status)
  const daysLeft  = plan?.expires_at ? daysUntil(plan.expires_at) : null

  const waEnquiry = `Hi, I'd like to enquire about a care plan for my *${appliance.brand} ${appliance.model}*. Could you share eligibility and available options?`

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header row */}
      <div className="flex items-center gap-3 p-4">
        <span className="text-2xl w-9 text-center flex-shrink-0">{icon}</span>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900 text-sm leading-none">{appliance.brand} {appliance.model}</p>
          <p className="text-xs text-gray-400 mt-0.5">{planCategory ?? appliance.category}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {planLabel ? (
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${planLabel.bg} ${planLabel.color}`}>
              {planLabel.label}
            </span>
          ) : (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">No Plan</span>
          )}
          {starts && (
            <button onClick={() => setExpanded(e => !e)}
              className="w-7 h-7 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors">
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Active plan details strip */}
      {isActive && plan && (
        <div className="px-4 pb-3 -mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
          <span className={`font-semibold ${PLAN_META[plan.plan_tier]?.color ?? ''}`}>
            {PLAN_META[plan.plan_tier]?.label}
          </span>
          {plan.expires_at && (
            <>
              <span>·</span>
              <span>{daysLeft !== null && daysLeft > 0 ? `${daysLeft}d remaining` : 'Expiring today'}</span>
              <span>·</span>
              <span>Until {fmtDate(plan.expires_at)}</span>
            </>
          )}
          {plan.annual_price && (
            <>
              <span>·</span>
              <span>{fmtPKR(plan.annual_price)}/yr</span>
            </>
          )}
          {plan.replacement_used && (
            <>
              <span>·</span>
              <span className="text-amber-600 font-medium">Replacement used</span>
            </>
          )}
        </div>
      )}

      {/* Status messages */}
      {plan?.status === 'pending_inspection' && (
        <div className="mx-4 mb-3 bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700">
          Pending pre-enrollment inspection — our team will contact you to schedule a visit.
        </div>
      )}
      {plan?.status === 'inspection_required' && (
        <div className="mx-4 mb-3 bg-purple-50 border border-purple-200 rounded-xl p-3 text-xs text-purple-700 flex items-center justify-between gap-2">
          <span>Inspection required before this plan can be activated.</span>
          <a href={waSales(waEnquiry)} target="_blank" rel="noopener noreferrer"
            className="font-semibold text-purple-600 underline whitespace-nowrap">Schedule via WhatsApp</a>
        </div>
      )}
      {plan?.status === 'not_eligible' && (
        <div className="mx-4 mb-3 bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs text-gray-600">
          {plan.notes || 'This appliance is currently not eligible for a care plan.'}
        </div>
      )}
      {plan?.status === 'cancelled' && (
        <div className="mx-4 mb-3 bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs text-gray-500">
          Plan cancelled. Contact us to re-enroll.
        </div>
      )}
      {plan?.status === 'expired' && (
        <div className="mx-4 mb-3 bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700 flex items-center justify-between gap-2">
          <span>Plan expired — renew to restore coverage.</span>
          <button onClick={() => setExpanded(e => !e)}
            className="font-semibold text-red-600 underline whitespace-nowrap">
            {expanded ? 'Hide options' : 'Renew now'}
          </button>
        </div>
      )}

      {/* Plan options (expanded) */}
      {expanded && starts && (
        <div className="border-t border-gray-100 p-4">
          <p className="text-xs font-semibold text-gray-500 mb-3">
            {plan ? 'Plan options — renew or upgrade:' : 'Choose a care plan:'}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(['essential', 'plus', 'elite'] as const).map(tier => (
              <PlanCard key={tier} tier={tier} price={starts[tier]} appliance={appliance} existingPlan={plan} />
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-3 leading-relaxed">
            * Prices are starting rates. Final price depends on appliance age and condition after inspection.
            All plans require a pre-enrollment inspection. Elite product replacement requires the appliance to be
            declared non-repairable by Tajalli's technical team; limited to 1 replacement per plan period.
          </p>
        </div>
      )}

      {/* No-plan CTA (collapsed) */}
      {!plan && !expanded && starts && (
        <div className="px-4 pb-4">
          <button onClick={() => setExpanded(true)}
            className="w-full text-xs font-semibold text-brand-600 border border-brand-200 rounded-xl py-2.5 hover:bg-brand-50 transition-colors flex items-center justify-center gap-1.5">
            <Shield className="w-3.5 h-3.5" />
            View Care Plans — from {fmtPKR(starts.essential)}/yr
          </button>
        </div>
      )}

      {/* No matching plan category */}
      {!starts && (
        <div className="px-4 pb-4">
          <a href={waSales(waEnquiry)} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700">
            <ExternalLink className="w-3.5 h-3.5" /> Enquire about coverage on WhatsApp
          </a>
        </div>
      )}
    </div>
  )
}

export default function PortalCarePlans({ appliances, carePlans, navigateTo }: PortalData) {
  const planByAppliance = new Map<string, CustomerCarePlan>()
  carePlans.forEach(cp => { if (cp.appliance_id) planByAppliance.set(cp.appliance_id, cp) })

  const activeCount  = appliances.filter(a => {
    const cp = planByAppliance.get(a.id)
    return cp && ['active', 'expiring_soon'].includes(cp.status)
  }).length
  const unprotected  = appliances.length - activeCount
  const pendingCount = carePlans.filter(cp => ['pending_inspection', 'inspection_required'].includes(cp.status)).length

  const waGeneral = `Hi, I'd like to learn about care plans for my appliances. I'm a registered Tajalli's portal customer.`

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-gray-900">Care Plans</h2>
          <p className="text-sm text-gray-500 mt-0.5">Annual protection for your appliances</p>
        </div>
        <a href={waSales(waGeneral)} target="_blank" rel="noopener noreferrer"
          className="text-xs font-semibold text-brand-600 border border-brand-200 rounded-xl px-3 py-2 hover:bg-brand-50 transition-colors flex items-center gap-1.5">
          <ExternalLink className="w-3.5 h-3.5" /> General Enquiry
        </a>
      </div>

      {/* Summary strip */}
      {appliances.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-green-50 border border-green-100 rounded-2xl p-3 text-center">
            <p className="text-xl font-black text-green-700">{activeCount}</p>
            <p className="text-xs text-green-600 font-medium mt-0.5">Protected</p>
          </div>
          <div className={`border rounded-2xl p-3 text-center ${unprotected > 0 ? 'bg-amber-50 border-amber-100' : 'bg-gray-50 border-gray-100'}`}>
            <p className={`text-xl font-black ${unprotected > 0 ? 'text-amber-700' : 'text-gray-400'}`}>{unprotected}</p>
            <p className={`text-xs font-medium mt-0.5 ${unprotected > 0 ? 'text-amber-600' : 'text-gray-400'}`}>Unprotected</p>
          </div>
          <div className={`border rounded-2xl p-3 text-center ${pendingCount > 0 ? 'bg-blue-50 border-blue-100' : 'bg-gray-50 border-gray-100'}`}>
            <p className={`text-xl font-black ${pendingCount > 0 ? 'text-blue-700' : 'text-gray-400'}`}>{pendingCount}</p>
            <p className={`text-xs font-medium mt-0.5 ${pendingCount > 0 ? 'text-blue-600' : 'text-gray-400'}`}>Pending</p>
          </div>
        </div>
      )}

      {/* Unprotected banner */}
      {unprotected > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <Shield className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-800">
              {unprotected} appliance{unprotected > 1 ? 's' : ''} without coverage
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              Add a care plan to protect against unexpected repair costs and extend appliance life.
            </p>
          </div>
        </div>
      )}

      {/* Appliance list */}
      {appliances.length === 0 ? (
        <div className="text-center py-12">
          <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="font-bold text-gray-500">No appliances registered</p>
          <p className="text-sm text-gray-400 mt-1">Add your appliances in the Appliances tab first.</p>
          <button onClick={() => navigateTo?.('appliances')}
            className="mt-4 text-sm font-semibold text-brand-600 border border-brand-200 rounded-xl px-4 py-2 hover:bg-brand-50 transition-colors">
            Go to My Appliances
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {appliances.map(a => (
            <AppliancePlanRow
              key={a.id}
              appliance={a}
              plan={planByAppliance.get(a.id)}
            />
          ))}
        </div>
      )}

      {/* Plan comparison footer */}
      {appliances.length > 0 && (
        <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4">
          <p className="text-xs font-bold text-gray-700 mb-3">Plan Comparison</p>
          <div className="grid grid-cols-3 gap-3 text-xs">
            {(['essential', 'plus', 'elite'] as const).map(tier => (
              <div key={tier}>
                <p className={`font-semibold mb-1.5 ${PLAN_META[tier].color}`}>{PLAN_META[tier].label}</p>
                <ul className="space-y-1">
                  {PLAN_META[tier].includes.map(item => (
                    <li key={item} className="flex items-start gap-1 text-gray-600">
                      <Check className="w-3 h-3 mt-0.5 text-green-500 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-3 pt-3 border-t border-gray-200 leading-relaxed">
            All plans are non-transferable and cover one appliance per enrollment. Pre-enrollment inspection required.
            * Elite product replacement limited to 1 unit per plan period and only applies if the covered appliance
            is declared non-repairable by Tajalli's technical team.
          </p>
        </div>
      )}
    </div>
  )
}
