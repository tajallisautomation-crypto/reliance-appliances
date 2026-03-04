// Services, Corporate, Portal pages
import { Phone, MessageCircle, Building2, User, Award, Shield, ClipboardList } from 'lucide-react'

export function Services() {
  const services = [
    { icon:'❄️', title:'AC Installation & Service', desc:'Professional installation, gas charging, and annual maintenance for all AC brands.' },
    { icon:'🧊', title:'Refrigerator Repair', desc:'Compressor, thermostat, and gas refilling by certified technicians.' },
    { icon:'☀️', title:'Solar Installation', desc:'Complete solar system design, installation, and commissioning.' },
    { icon:'🔌', title:'Appliance Repair', desc:'On-site and workshop repair for washing machines, geysers, and more.' },
    { icon:'🔧', title:'Annual Maintenance Contracts', desc:'Regular service visits and priority support for your appliances.' },
    { icon:'📦', title:'Home Delivery & Setup', desc:'White-glove delivery and installation for all products.' },
  ]
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 text-white py-16 px-4 text-center">
        <h1 className="text-4xl font-black mb-3">After-Sale Services</h1>
        <p className="text-gray-300 text-lg max-w-xl mx-auto">Professional installation and repair services for all the products we sell.</p>
      </div>
      <div className="max-w-5xl mx-auto px-4 py-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map(s => (
          <div key={s.title} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="text-3xl mb-4">{s.icon}</div>
            <h3 className="font-bold text-gray-800 mb-2">{s.title}</h3>
            <p className="text-sm text-gray-500">{s.desc}</p>
          </div>
        ))}
      </div>
      <div className="max-w-3xl mx-auto px-4 pb-14 text-center">
        <div className="bg-orange-50 rounded-3xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Book a Service</h2>
          <p className="text-gray-500 mb-6">Contact our service team to schedule an appointment.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href="https://wa.me/923702578788" className="bg-green-500 hover:bg-green-600 text-white px-8 py-3 rounded-xl font-semibold flex items-center gap-2 justify-center">
              <MessageCircle className="w-4 h-4" /> WhatsApp
            </a>
            <a href="tel:+923702578788" className="border border-gray-300 text-gray-700 hover:bg-gray-100 px-8 py-3 rounded-xl font-semibold flex items-center gap-2 justify-center">
              <Phone className="w-4 h-4" /> +92 370 2578788
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

export function Corporate() {
  const benefits = [
    { icon: Building2, title: 'Bulk Purchase Discounts', desc: 'Special pricing for orders of 5+ units.' },
    { icon: Shield, title: 'Extended Warranty', desc: 'Priority warranty and service for corporate clients.' },
    { icon: ClipboardList, title: 'Dedicated Account Manager', desc: 'Single point of contact for all your requirements.' },
    { icon: Award, title: 'Customised Packages', desc: 'Tailored bundles for offices, hotels, and industries.' },
  ]
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-blue-800 to-indigo-800 text-white py-16 px-4 text-center">
        <h1 className="text-4xl font-black mb-3">Corporate Solutions</h1>
        <p className="text-blue-200 text-lg max-w-xl mx-auto">Bulk pricing, dedicated support, and custom packages for businesses.</p>
      </div>
      <div className="max-w-5xl mx-auto px-4 py-14">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-14">
          {benefits.map(b => (
            <div key={b.title} className="bg-white rounded-2xl p-6 shadow-sm border text-center">
              <b.icon className="w-10 h-10 text-blue-600 mx-auto mb-3" />
              <h3 className="font-bold text-gray-800 mb-1">{b.title}</h3>
              <p className="text-sm text-gray-500">{b.desc}</p>
            </div>
          ))}
        </div>
        <div className="bg-blue-50 rounded-3xl p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Request a Corporate Quote</h2>
          <p className="text-gray-500 mb-6">Tell us your requirements and we'll prepare a custom proposal.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href="https://wa.me/923354266238" className="bg-blue-700 hover:bg-blue-800 text-white px-8 py-3 rounded-xl font-semibold flex items-center gap-2 justify-center">
              <MessageCircle className="w-4 h-4" /> WhatsApp Corporate Team
            </a>
            <a href="tel:+923354266238" className="border border-gray-300 text-gray-700 px-8 py-3 rounded-xl font-semibold flex items-center gap-2 justify-center">
              <Phone className="w-4 h-4" /> +92 335 4266238
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

export function Portal() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white py-16 px-4 text-center">
        <User className="w-12 h-12 mx-auto mb-3 opacity-80" />
        <h1 className="text-4xl font-black mb-3">Customer Portal</h1>
        <p className="text-orange-100 text-lg">Track orders, warranties, and service history.</p>
      </div>
      <div className="max-w-lg mx-auto px-4 py-14 text-center">
        <div className="bg-white rounded-3xl p-8 shadow-sm border">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Coming Soon</h2>
          <p className="text-gray-500 mb-6">The customer portal is under development.</p>
          <a href="https://wa.me/923702578788" className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-8 py-3 rounded-xl font-semibold">
            <MessageCircle className="w-4 h-4" /> Contact Support
          </a>
        </div>
      </div>
    </div>
  )
}

export default Services
