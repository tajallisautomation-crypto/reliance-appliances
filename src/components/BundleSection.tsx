import { Link } from 'react-router-dom';
import { AirVent, Refrigerator, Shirt, Sun, CheckCircle, MessageCircle, ArrowRight } from 'lucide-react';
import { waBundleAC, waBundleFridge, waBundleWasher, waBundleSolar, openWhatsApp } from '@/lib/whatsapp';

const BUNDLES = [
  {
    icon: AirVent,
    iconColor: 'text-blue-600',
    iconBg: 'bg-blue-50',
    name: 'AC Complete Package',
    items: ['Inverter AC', 'Professional Installation', 'Stabilizer', 'Free Solar Consult'],
    discount: '5%',
    waFn: waBundleAC,
  },
  {
    icon: Refrigerator,
    iconColor: 'text-cyan-700',
    iconBg: 'bg-cyan-50',
    name: 'Fridge & Home Bundle',
    items: ['Inverter Refrigerator', 'Fridge Mat', 'Free Delivery', '1-yr Care Plan'],
    discount: '4%',
    waFn: waBundleFridge,
  },
  {
    icon: Shirt,
    iconColor: 'text-indigo-600',
    iconBg: 'bg-indigo-50',
    name: 'Laundry Starter Pack',
    items: ['Washing Machine', 'Machine Stand', 'Installation', '1-yr Service Plan'],
    discount: '5%',
    waFn: waBundleWasher,
  },
  {
    icon: Sun,
    iconColor: 'text-amber-600',
    iconBg: 'bg-amber-50',
    name: 'Solar Power Bundle',
    items: ['Solar Panels', 'Hybrid Inverter', 'Battery Bank', 'AC Compatibility Check'],
    discount: '3%',
    waFn: waBundleSolar,
  },
];

export default function BundleSection() {
  return (
    <section className="py-14 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full mb-3">
              Bundle & Save 3–5%
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900">Popular Bundles</h2>
            <p className="text-gray-500 mt-1 text-sm">Installation, accessories & service plans — included from day one.</p>
          </div>
          <Link to="/bundles"
            className="inline-flex items-center gap-2 text-brand-600 font-semibold text-sm hover:text-brand-700 whitespace-nowrap">
            See all bundles <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {BUNDLES.map(bundle => {
            const Icon = bundle.icon;
            return (
              <div key={bundle.name}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl ${bundle.iconBg} flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${bundle.iconColor}`} />
                  </div>
                  <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                    {bundle.discount} off
                  </span>
                </div>

                <h3 className="font-bold text-gray-900 text-sm mb-2">{bundle.name}</h3>

                <ul className="space-y-1 mb-4 flex-1">
                  {bundle.items.map(item => (
                    <li key={item} className="flex items-center gap-1.5 text-xs text-gray-600">
                      <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => openWhatsApp(bundle.waFn())}
                  className="w-full flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold py-2.5 rounded-xl transition-colors">
                  <MessageCircle className="w-3.5 h-3.5" />
                  Get Quote
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
