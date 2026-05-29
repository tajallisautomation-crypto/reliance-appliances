'use client'

import Link from 'next/link';
import { MessageCircle, CheckCircle, Package, AirVent, Refrigerator, Shirt, Sun, ArrowRight, Zap } from 'lucide-react';
import { waBundleAC, waBundleFridge, waBundleWasher, waBundleSolar, openWhatsApp } from '@/lib/whatsapp';
import SEO from '@/components/ui/SEO';

interface BundleItem {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  iconBg: string;
  tag: string;
  tagColor: string;
  name: string;
  tagline: string;
  discount: string;
  saving: string;
  includes: string[];
  whyBundle: string;
  ctaLabel: string;
  waFn: () => string;
  accentBorder: string;
}

const BUNDLES: BundleItem[] = [
  {
    id: 'ac-complete',
    icon: AirVent,
    iconColor: 'text-blue-600',
    iconBg: 'bg-blue-50',
    tag: 'Most Popular',
    tagColor: 'bg-blue-600',
    name: 'AC Complete Package',
    tagline: 'Everything for a worry-free cooling upgrade — delivered, installed, protected.',
    discount: '5%',
    saving: 'Save PKR 5,000+',
    includes: [
      'Inverter AC (brand & model of your choice)',
      'Professional installation (wiring + gas charge)',
      'Voltage stabilizer — protects from power fluctuations',
      'Free solar suitability consultation',
    ],
    whyBundle: 'Buying separately adds PKR 5,000–8,000 in visit & coordination costs. One order, one team, one day.',
    ctaLabel: 'Get AC Bundle Quote',
    waFn: waBundleAC,
    accentBorder: 'border-t-blue-500',
  },
  {
    id: 'fridge-home',
    icon: Refrigerator,
    iconColor: 'text-cyan-700',
    iconBg: 'bg-cyan-50',
    tag: 'Best Value',
    tagColor: 'bg-cyan-600',
    name: 'Fridge & Home Bundle',
    tagline: 'Refrigerator delivered, protected, and maintained — fully sorted.',
    discount: '4%',
    saving: 'Save PKR 3,000+',
    includes: [
      'Inverter refrigerator (size & brand of your choice)',
      'Anti-vibration fridge mat (floor protection)',
      'Free white-glove delivery & placement',
      '1-year Essential Care Plan (optional add-on)',
    ],
    whyBundle: 'Fridge mats and care plans are commonly forgotten at purchase — bundled here they\'re cheaper and pre-arranged.',
    ctaLabel: 'Get Fridge Bundle Quote',
    waFn: waBundleFridge,
    accentBorder: 'border-t-cyan-500',
  },
  {
    id: 'laundry-starter',
    icon: Shirt,
    iconColor: 'text-indigo-600',
    iconBg: 'bg-indigo-50',
    tag: 'Set It & Forget It',
    tagColor: 'bg-indigo-600',
    name: 'Laundry Starter Pack',
    tagline: 'Washing machine fully set up from day one — stand, drain, service covered.',
    discount: '5%',
    saving: 'Save PKR 4,000+',
    includes: [
      'Automatic washing machine (top or front load)',
      'Heavy-duty adjustable machine stand',
      'Professional installation (inlet + drain setup)',
      '1-year service plan (2 service visits included)',
    ],
    whyBundle: 'Poor installation and no stand are the #1 cause of early washing machine damage. This bundle prevents both.',
    ctaLabel: 'Get Laundry Bundle Quote',
    waFn: waBundleWasher,
    accentBorder: 'border-t-indigo-500',
  },
  {
    id: 'solar-power',
    icon: Sun,
    iconColor: 'text-amber-600',
    iconBg: 'bg-amber-50',
    tag: 'Cut Bills 60%+',
    tagColor: 'bg-amber-600',
    name: 'Solar Power Bundle',
    tagline: 'Complete solar system + inverter + battery — with free AC compatibility check.',
    discount: '3%',
    saving: '3–4 year ROI',
    includes: [
      'Solar panel array (3–5 kW, sized after free site visit)',
      'Hybrid inverter (net metering ready)',
      'Lithium battery bank (6–8 hrs backup)',
      'Free AC compatibility & load audit',
    ],
    whyBundle: 'Most solar quotes skip the battery and compatibility check — this bundle is complete from the start.',
    ctaLabel: 'Get Solar Bundle Quote',
    waFn: waBundleSolar,
    accentBorder: 'border-t-amber-500',
  },
];

export default function BundlesPage() {
  return (
    <>
      <SEO
        title="Bundle Deals — AC, Fridge, Solar & Laundry Packages | Tajalli's"
        description="Pre-configured appliance bundles with installation, service plans, and accessories included. AC + stabilizer, fridge + care plan, solar + battery, washing machine + stand."
      />
      

      {/* Hero */}
      <div className="bg-gradient-to-b from-gray-900 to-gray-800 text-white">
        <div className="max-w-5xl mx-auto px-4 py-14 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 text-sm font-medium mb-5">
            <Package className="w-4 h-4 text-amber-400" />
            Bundle & Save
          </div>
          <h1 className="text-3xl sm:text-4xl font-black mb-4">
            Everything Included.<br className="hidden sm:block" /> One Order. One Team.
          </h1>
          <p className="text-gray-300 text-lg max-w-2xl mx-auto mb-8">
            Pre-built packages with installation, accessories, and service plans — no chasing separate vendors, no forgotten extras.
          </p>
          <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-300">
            <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-400" /> 3–5% bundle discount</div>
            <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-400" /> Free delivery across Karachi</div>
            <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-400" /> Professional installation included</div>
          </div>
        </div>
      </div>

      {/* Bundle cards */}
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {BUNDLES.map(bundle => {
            const Icon = bundle.icon;
            return (
              <div key={bundle.id}
                className={`bg-white rounded-2xl border-2 border-t-4 ${bundle.accentBorder} border-gray-100 shadow-sm hover:shadow-md transition-shadow flex flex-col`}>
                <div className="p-6 flex-1">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-12 h-12 rounded-xl ${bundle.iconBg} flex items-center justify-center`}>
                      <Icon className={`w-6 h-6 ${bundle.iconColor}`} />
                    </div>
                    <span className={`text-xs font-bold text-white px-2.5 py-1 rounded-full ${bundle.tagColor}`}>
                      {bundle.tag}
                    </span>
                  </div>

                  <h2 className="text-xl font-bold text-gray-900 mb-1">{bundle.name}</h2>
                  <p className="text-gray-500 text-sm mb-4">{bundle.tagline}</p>

                  <div className="flex items-center gap-3 mb-4">
                    <span className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full">
                      {bundle.discount} bundle discount
                    </span>
                    <span className="text-xs text-gray-500">{bundle.saving}</span>
                  </div>

                  <ul className="space-y-2 mb-4">
                    {bundle.includes.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                        {item}
                      </li>
                    ))}
                  </ul>

                  <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-500 flex items-start gap-2">
                    <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                    <span>{bundle.whyBundle}</span>
                  </div>
                </div>

                <div className="px-6 pb-6">
                  <button
                    onClick={() => openWhatsApp(bundle.waFn())}
                    className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl transition-colors text-sm">
                    <MessageCircle className="w-4 h-4" />
                    {bundle.ctaLabel}
                  </button>
                  <p className="text-center text-xs text-gray-400 mt-2">
                    We'll send a complete quote within minutes
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Custom bundle CTA */}
        <div className="mt-10 bg-brand-50 border border-brand-100 rounded-2xl p-6 text-center">
          <h3 className="font-bold text-gray-900 text-lg mb-2">Need a Custom Bundle?</h3>
          <p className="text-gray-600 text-sm mb-4">
            Mix and match any appliances — AC + solar + fridge + washing machine — and get one consolidated quote with delivery and installation.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/build-your-package"
              className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm">
              <Package className="w-4 h-4" />
              Build Your Own Package
            </Link>
            <Link href="/products"
              className="inline-flex items-center gap-2 border border-brand-300 text-brand-700 hover:bg-brand-50 font-medium px-6 py-3 rounded-xl transition-colors text-sm">
              Browse All Products
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Trust signals */}
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center text-sm">
          {[
            { value: '14,400+', label: 'Happy Customers' },
            { value: '24,000+', label: 'Jobs Completed' },
            { value: '6–48h',   label: 'Delivery Time' },
            { value: '75%',     label: 'Repeat Customers' },
          ].map(s => (
            <div key={s.label} className="bg-white border border-gray-100 rounded-xl p-4">
              <div className="text-xl font-black text-gray-900">{s.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
