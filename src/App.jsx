import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ShopifyProvider, CartProvider } from '@shopify/hydrogen-react';
import MainLayout from './layouts/MainLayout';
import HomePage from './pages/HomePage';
import ServicesPage from './pages/ServicesPage';
import ShopPage from './pages/ShopPage';
import CheckoutPage from './pages/CheckoutPage';
import ContactPage from './pages/ContactPage';
import PaymentPage from './pages/PaymentPage';
import ProductPage from './pages/ProductPage';

export default function App() {
  return (
    <ShopifyProvider
      storeDomain={import.meta.env.VITE_SHOPIFY_STORE_DOMAIN}
      storefrontToken={import.meta.env.VITE_SHOPIFY_STOREFRONT_TOKEN}
      storefrontApiVersion="2025-01"
      countryIsoCode="AU"
      languageIsoCode="EN"
    >
      <CartProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<MainLayout />}>
              <Route index element={<HomePage />} />
              <Route path="/services" element={<ServicesPage />} />
              <Route path="/shop" element={<ShopPage />} />
              <Route path="/search" element={<ShopPage />} />
              <Route path="/products/:handle" element={<ProductPage />} />
              <Route path="/checkout"         element={<CheckoutPage />} />
              <Route path="/checkout/contact" element={<ContactPage />} />
              <Route path="/checkout/payment" element={<PaymentPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </CartProvider>
    </ShopifyProvider>
  );
}
