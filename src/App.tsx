import { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import Spinner from '@/components/ui/Spinner';

const Home          = lazy(() => import('@/pages/Home'));
const Products      = lazy(() => import('@/pages/Products'));
const ProductDetail = lazy(() => import('@/pages/ProductDetail'));
const Cart          = lazy(() => import('@/pages/Cart'));
const Checkout      = lazy(() => import('@/pages/Checkout'));
const Installments  = lazy(() => import('@/pages/Installments'));
const Services      = lazy(() => import('@/pages/Services'));
const SolarPage     = lazy(() => import('@/pages/SolarPage'));
const Corporate     = lazy(() => import('@/pages/Corporate'));
const Portal        = lazy(() => import('@/pages/Portal'));
const Dashboard     = lazy(() => import('@/pages/Dashboard'));
const About         = lazy(() => import('@/pages/misc').then(m => ({ default: m.About })));
const Contact       = lazy(() => import('@/pages/misc').then(m => ({ default: m.Contact })));
const FAQ           = lazy(() => import('@/pages/misc').then(m => ({ default: m.FAQ })));
const Policy        = lazy(() => import('@/pages/misc').then(m => ({ default: m.Policy })));
const NotFound      = lazy(() => import('@/pages/misc').then(m => ({ default: m.NotFound })));

export default function App() {
  return (
    <Suspense fallback={<Spinner />}>
      <Routes>
        {/* Admin dashboard — no layout wrapper */}
        <Route path="/admin" element={<Dashboard />} />

        <Route path="/" element={<Layout />}>
          <Route index                                   element={<Home />} />
          <Route path="products"                         element={<Products />} />
          <Route path="products/solar-solutions"         element={<SolarPage />} />
          <Route path="products/category/:categorySlug"  element={<Products />} />
          <Route path="products/:slug"                   element={<ProductDetail />} />
          <Route path="product/:slug"                    element={<ProductDetail />} />
          <Route path="cart"                             element={<Cart />} />
          <Route path="checkout"                         element={<Checkout />} />
          <Route path="installments"                     element={<Installments />} />
          <Route path="services"                         element={<Services />} />
          <Route path="corporate"                        element={<Corporate />} />
          <Route path="portal"                           element={<Portal />} />
          <Route path="portal/:tab"                      element={<Portal />} />
          <Route path="about"                            element={<About />} />
          <Route path="contact"                          element={<Contact />} />
          <Route path="faq"                              element={<FAQ />} />
          <Route path="policy/:type"                     element={<Policy />} />
          <Route path="*"                                element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
