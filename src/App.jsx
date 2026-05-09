import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect, useRef, lazy, Suspense } from 'react';
import { HelmetProvider } from 'react-helmet-async';
import * as Sentry from '@sentry/react';
import AdminRoute from './components/admin/AdminRoute';
import WholesaleRoute from './components/auth/WholesaleRoute';
import ErrorBoundary from './components/ErrorBoundary';
import useAuthStore from './store/authStore';
import useCartStore from './store/cartStore';
import MainLayout from './layouts/MainLayout';

// Sentry-instrumented Routes. Renders identically to react-router's <Routes>
// but reports parameterised route names to Sentry's tracing so the dashboard
// shows /products/:handle instead of every concrete slug.
const SentryRoutes = Sentry.withSentryReactRouterV6Routing(Routes);

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);
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

// Lazy-load all page components for code splitting
const HomePage = lazy(() => import('./pages/HomePage'));
const ServicesPage = lazy(() => import('./pages/ServicesPage'));
const ServiceDetailPage = lazy(() => import('./pages/ServiceDetailPage'));
const ShopPage = lazy(() => import('./pages/ShopPage'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const PaymentPage = lazy(() => import('./pages/PaymentPage'));
const AfterpayReturnPage = lazy(() => import('./pages/AfterpayReturnPage'));
const ProductPage = lazy(() => import('./pages/ProductPage'));
const BrandsPage = lazy(() => import('./pages/BrandsPage'));
const BookingPage = lazy(() => import('./pages/BookingPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const ContactUsPage = lazy(() => import('./pages/ContactUsPage'));
const TermsPage = lazy(() => import('./pages/TermsPage'));
const ReturnsPage = lazy(() => import('./pages/ReturnsPage'));
const ShippingPage = lazy(() => import('./pages/ShippingPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const AccountDashboard = lazy(() => import('./pages/AccountDashboard'));
const TrackOrderPage = lazy(() => import('./pages/TrackOrderPage'));
const WholesalePage = lazy(() => import('./pages/WholesalePage'));
const WholesaleOrderPage = lazy(() => import('./pages/WholesaleOrderPage'));
const OrderConfirmationPage = lazy(() => import('./pages/OrderConfirmationPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'));
const AdminProducts = lazy(() => import('./pages/admin/AdminProducts'));
const AdminProductForm = lazy(() => import('./pages/admin/AdminProductForm'));
const AdminPromoBanner = lazy(() => import('./pages/admin/AdminPromoBanner'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminOrders = lazy(() => import('./pages/admin/AdminOrders'));
const AdminDeveloper = lazy(() => import('./pages/admin/AdminDeveloper'));

export default function App() {
  return (
    <HelmetProvider>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ScrollToTop />
      <CartRepricer />
      <ErrorBoundary>
      <Suspense fallback={<div style={{minHeight:'100vh',background:'#0a0a0a'}} />}>
      <SentryRoutes>
        {/* Admin routes — no site layout */}
        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/admin/products" element={<AdminRoute><AdminProducts /></AdminRoute>} />
        <Route path="/admin/products/new" element={<AdminRoute><AdminProductForm /></AdminRoute>} />
        <Route path="/admin/products/:id" element={<AdminRoute><AdminProductForm /></AdminRoute>} />
        <Route path="/admin/promo-banner" element={<AdminRoute><AdminPromoBanner /></AdminRoute>} />
        <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
        <Route path="/admin/orders" element={<AdminRoute><AdminOrders /></AdminRoute>} />
        <Route path="/admin/developer" element={<AdminRoute><AdminDeveloper /></AdminRoute>} />

        <Route element={<MainLayout />}>
          <Route index element={<HomePage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/services/:slug" element={<ServiceDetailPage />} />
          <Route path="/shop" element={<ShopPage />} />
          <Route path="/search" element={<ShopPage />} />
          <Route path="/products/:handle" element={<ProductPage />} />
          <Route path="/brands" element={<BrandsPage />} />
          <Route path="/book" element={<BookingPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactUsPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/returns" element={<ReturnsPage />} />
          <Route path="/shipping" element={<ShippingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/wholesale-login" element={<LoginPage />} />
          <Route path="/my-account" element={<LoginPage />} />
          <Route path="/my-account/register" element={<RegisterPage />} />
          <Route path="/my-account/lost-password" element={<ForgotPasswordPage />} />
          <Route path="/my-account/reset-password" element={<ResetPasswordPage />} />
          <Route path="/my-account/dashboard" element={<AccountDashboard />} />
          <Route path="/my-account/orders" element={<TrackOrderPage />} />
          <Route path="/wholesale-registration" element={<WholesalePage />} />
          <Route path="/wholesale" element={<WholesaleRoute><WholesaleOrderPage /></WholesaleRoute>} />
          <Route path="/checkout"         element={<CheckoutPage />} />
          <Route path="/checkout/contact" element={<ContactPage />} />
          <Route path="/checkout/payment" element={<PaymentPage />} />
          <Route path="/checkout/afterpay-return" element={<AfterpayReturnPage />} />
          <Route path="/order-confirmation" element={<OrderConfirmationPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </SentryRoutes>
      </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
    </HelmetProvider>
  );
}
