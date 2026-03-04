import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from './components/layout/Layout'
import Home from './pages/Home'
import Products from './pages/Products'
import ProductDetail from './pages/ProductDetail'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import Installments from './pages/Installments'
import SolarPage from './pages/SolarPage'
import SolarCalculator from './pages/SolarCalculator'
import ToolsPage from './pages/ToolsPage'
import Services from './pages/Services'
import Corporate from './pages/Corporate'
import Portal from './pages/Portal'

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/"                 element={<Home />} />
          <Route path="/products"         element={<Products />} />
          <Route path="/products/:id"     element={<ProductDetail />} />
          <Route path="/cart"             element={<Cart />} />
          <Route path="/checkout"         element={<Checkout />} />
          <Route path="/installments"     element={<Installments />} />
          <Route path="/solar"            element={<SolarPage />} />
          <Route path="/solar-calculator" element={<SolarCalculator />} />
          <Route path="/tools"            element={<ToolsPage />} />
          <Route path="/services"         element={<Services />} />
          <Route path="/corporate"        element={<Corporate />} />
          <Route path="/portal"           element={<Portal />} />
          <Route path="*" element={
            <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
              <div className="text-6xl font-black text-gray-100">404</div>
              <p className="text-gray-500">Page not found</p>
              <a href="/" className="bg-orange-500 text-white px-6 py-2 rounded-xl font-medium">Go Home</a>
            </div>
          } />
        </Routes>
      </Layout>
    </Router>
  )
}
