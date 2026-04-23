import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Suspense, lazy, useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import Layout from './components/layout/Layout'
import { useSettingsStore } from './store/settingsStore'
import ErrorBoundary from './components/ui/ErrorBoundary'
import Spinner from './components/ui/Spinner'
import { captureRef } from './lib/referral'

// Critical path — loaded immediately (LCP pages)
import Home from './pages/Home'
import Products from './pages/Products'
import ProductDetail from './pages/ProductDetail'

// Deferred — split into separate chunks (saves ~40% of initial JS)
const Cart            = lazy(() => import('./pages/Cart'))
const Checkout        = lazy(() => import('./pages/Checkout'))
const Installments    = lazy(() => import('./pages/Installments'))
const SolarPage       = lazy(() => import('./pages/SolarPage'))
const SolarCalculator = lazy(() => import('./pages/SolarCalculator'))
const OffGridSolar    = lazy(() => import('./pages/OffGridSolar'))
const ToolsPage       = lazy(() => import('./pages/ToolsPage'))
const Services        = lazy(() => import('./pages/Services'))
const Corporate       = lazy(() => import('./pages/Corporate'))
const GreenCorridor   = lazy(() => import('./pages/GreenCorridor'))
const Partner         = lazy(() => import('./pages/Partner'))
const Portal          = lazy(() => import('./pages/Portal'))
const AdminPortal     = lazy(() => import('./pages/AdminPortal'))
const About           = lazy(() => import('./pages/About'))
const Contact         = lazy(() => import('./pages/Contact'))
const PolicyPage      = lazy(() => import('./pages/PolicyPage'))
const SearchResults   = lazy(() => import('./pages/SearchResults'))
const ComparePage     = lazy(() => import('./pages/ComparePage'))
const BuyingGuide     = lazy(() => import('./pages/BuyingGuide'))
const Referral        = lazy(() => import('./pages/Referral'))
const Support         = lazy(() => import('./pages/Support'))
// SalesCatalog is admin-only — /catalog redirects to /admin (route kept for bookmarks)
const MYOP            = lazy(() => import('./pages/MYOP'))
const Gallery         = lazy(() => import('./pages/Gallery'))

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

export default function App() {
  useEffect(() => { useSettingsStore.getState().load(); captureRef(); }, []);

  return (
    <Router>
      <ScrollToTop />
      <Toaster position="bottom-right" toastOptions={{ duration: 2000, style: { borderRadius: '12px', fontSize: '13px' } }} />
      <ErrorBoundary>
      <Layout>
        <Suspense fallback={<Spinner />}>
          <Routes>
            <Route path="/"                                 element={<Home />} />
            <Route path="/products"                         element={<Products />} />
            <Route path="/products/category/:categorySlug"  element={<Products />} />
            <Route path="/products/:slug"                   element={<ProductDetail />} />
            {/* Per-route boundaries on high-risk pages — error in one doesn't crash navigation */}
            <Route path="/cart"                             element={<ErrorBoundary><Cart /></ErrorBoundary>} />
            <Route path="/checkout"                         element={<ErrorBoundary><Checkout /></ErrorBoundary>} />
            <Route path="/installments"                     element={<Installments />} />
            <Route path="/solar"                            element={<SolarPage />} />
            <Route path="/solar-calculator"                 element={<ErrorBoundary><SolarCalculator /></ErrorBoundary>} />
            <Route path="/solar/off-grid"                   element={<OffGridSolar />} />
            <Route path="/tools"                            element={<ToolsPage />} />
            <Route path="/services"                         element={<Services />} />
            <Route path="/green-corridor"                   element={<GreenCorridor />} />
            <Route path="/partner"                          element={<Partner />} />
            <Route path="/corporate"                        element={<Corporate />} />
            <Route path="/portal"                           element={<Portal />} />
            <Route path="/admin"                            element={<ErrorBoundary><AdminPortal /></ErrorBoundary>} />
            <Route path="/about"                            element={<About />} />
            <Route path="/contact"                          element={<Contact />} />
            <Route path="/search"                           element={<SearchResults />} />
            <Route path="/compare"                          element={<ComparePage />} />
            <Route path="/buying-guide"                     element={<BuyingGuide />} />
            <Route path="/build-your-package"               element={<MYOP />} />
            <Route path="/referral"                         element={<Referral />} />
            <Route path="/support"                          element={<Support />} />
            <Route path="/catalog"                          element={<Navigate to="/admin" replace />} />
            <Route path="/gallery"                          element={<Gallery />} />
            <Route path="/policy/:type"                     element={<PolicyPage />} />
            <Route path="*" element={
              <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
                <div className="text-6xl font-black text-gray-100">404</div>
                <p className="text-gray-500">Page not found</p>
                <a href="/" className="bg-orange-500 text-white px-6 py-2 rounded-xl font-medium hover:bg-orange-600">Go Home</a>
              </div>
            } />
          </Routes>
        </Suspense>
      </Layout>
      </ErrorBoundary>
    </Router>
  )
}
