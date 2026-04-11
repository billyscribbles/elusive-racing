import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { HelmetProvider } from 'react-helmet-async';
import AdminLogin from './pages/admin/AdminLogin';
import AdminProducts from './pages/admin/AdminProducts';
import AdminProductForm from './pages/admin/AdminProductForm';
import AdminPromoBanner from './pages/admin/AdminPromoBanner';
import AdminDeveloper from './pages/admin/AdminDeveloper';
import AdminRoute from './components/admin/AdminRoute';
import useAuthStore from './store/authStore';
import useCartStore from './store/cartStore';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

function CartRepricer() {
  const user = useAuthStore(s => s.user);
  const repriceAll = useCartStore(s => s.repriceAll);
  const prevRole = useRef(user?.role);

  useEffect(() => {
    if (user?.role !== prevRole.current) {
      const tierKey = (user?.role || '').startsWith('wholesale_customer')
        ? user?.wholesaleTier?.role ?? null
        : null;
      repriceAll(tierKey);
      prevRole.current = user?.role;
    }
  }, [user, repriceAll]);

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
import TrackOrderPage from './pages/TrackOrderPage';
import WholesalePage from './pages/WholesalePage';
import WholesaleOrderPage from './pages/WholesaleOrderPage';
import WholesaleRoute from './components/auth/WholesaleRoute';
import OrderConfirmationPage from './pages/OrderConfirmationPage';

export default function App() {
  return (
    <HelmetProvider>
    <BrowserRouter>
      <ScrollToTop />
      <CartRepricer />
      <Routes>
        {/* Admin routes — no site layout */}
        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/admin/products" element={<AdminRoute><AdminProducts /></AdminRoute>} />
        <Route path="/admin/products/new" element={<AdminRoute><AdminProductForm /></AdminRoute>} />
        <Route path="/admin/products/:id" element={<AdminRoute><AdminProductForm /></AdminRoute>} />
        <Route path="/admin/promo-banner" element={<AdminRoute><AdminPromoBanner /></AdminRoute>} />
        <Route path="/admin/developer" element={<AdminRoute><AdminDeveloper /></AdminRoute>} />

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
          <Route path="/login" element={<LoginPage />} />
          <Route path="/my-account" element={<LoginPage />} />
          <Route path="/my-account/register" element={<RegisterPage />} />
          <Route path="/my-account/dashboard" element={<AccountDashboard />} />
          <Route path="/my-account/orders" element={<TrackOrderPage />} />
          <Route path="/wholesale-registration" element={<WholesalePage />} />
          <Route path="/wholesale" element={<WholesaleRoute><WholesaleOrderPage /></WholesaleRoute>} />
          <Route path="/checkout"         element={<CheckoutPage />} />
          <Route path="/checkout/contact" element={<ContactPage />} />
          <Route path="/checkout/payment" element={<PaymentPage />} />
          <Route path="/order-confirmation" element={<OrderConfirmationPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
    </HelmetProvider>
  );
}
