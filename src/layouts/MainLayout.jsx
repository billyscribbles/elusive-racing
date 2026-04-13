import { useEffect, lazy, Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import TopBar from '../components/layout/TopBar';
import Header from '../components/layout/Header';
import Navigation from '../components/layout/Navigation';
import Footer from '../components/layout/Footer';
import { getCachedCategories } from '../lib/woocommerce';

const ChatWidget = lazy(() => import('../components/ui/ChatWidget'));
const ConsentBanner = lazy(() => import('../components/ui/ConsentBanner'));

export default function MainLayout() {
  // Warm category cache immediately so filters and search are instant
  useEffect(() => { getCachedCategories(); }, []);

  return (
    <div className="app">
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <TopBar />
      <Header />
      <Navigation />
      <main id="main-content">
        <Outlet />
      </main>
      <Footer />
      <Suspense fallback={null}><ChatWidget /></Suspense>
      <Suspense fallback={null}><ConsentBanner /></Suspense>
    </div>
  );
}
