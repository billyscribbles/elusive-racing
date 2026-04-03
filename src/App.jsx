import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { HelmetProvider } from 'react-helmet-async';
import AdminLogin from './pages/admin/AdminLogin';
import AdminProducts from './pages/admin/AdminProducts';
import AdminProductForm from './pages/admin/AdminProductForm';
import AdminPromoBanner from './pages/admin/AdminPromoBanner';
import AdminRoute from './components/admin/AdminRoute';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}
import MainLayout from './layouts/MainLayout';
import HomePage from './pages/HomePage';
import ServicesPage from './pages/ServicesPage';
import ShopPage from './pages/ShopPage';
import CheckoutPage from './pages/CheckoutPage';
import ContactPage from './pages/ContactPage';
import PaymentPage from './pages/PaymentPage';
import ProductPage from './pages/ProductPage';
import BrandsPage from './pages/BrandsPage';
import BookingPage from './pages/BookingPage';
import AboutPage from './pages/AboutPage';
import ContactUsPage from './pages/ContactUsPage';
import TermsPage from './pages/TermsPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AccountDashboard from './pages/AccountDashboard';
import WholesalePage from './pages/WholesalePage';

export default function App() {
  return (
    <HelmetProvider>
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        {/* Admin routes — no site layout */}
        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/admin/products" element={<AdminRoute><AdminProducts /></AdminRoute>} />
        <Route path="/admin/products/new" element={<AdminRoute><AdminProductForm /></AdminRoute>} />
        <Route path="/admin/products/:id" element={<AdminRoute><AdminProductForm /></AdminRoute>} />
        <Route path="/admin/promo-banner" element={<AdminRoute><AdminPromoBanner /></AdminRoute>} />

        <Route element={<MainLayout />}>
          <Route index element={<HomePage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/shop" element={<ShopPage />} />
          <Route path="/search" element={<ShopPage />} />
          <Route path="/products/:handle" element={<ProductPage />} />
          <Route path="/brands" element={<BrandsPage />} />
          <Route path="/book" element={<BookingPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactUsPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/my-account" element={<LoginPage />} />
          <Route path="/my-account/register" element={<RegisterPage />} />
          <Route path="/my-account/dashboard" element={<AccountDashboard />} />
          <Route path="/wholesale-registration" element={<WholesalePage />} />
          <Route path="/checkout"         element={<CheckoutPage />} />
          <Route path="/checkout/contact" element={<ContactPage />} />
          <Route path="/checkout/payment" element={<PaymentPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
    </HelmetProvider>
  );
}
