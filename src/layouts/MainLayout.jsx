import { Outlet } from 'react-router-dom';
import TopBar from '../components/layout/TopBar';
import Header from '../components/layout/Header';
import Navigation from '../components/layout/Navigation';
import StickyFinder from '../components/layout/StickyFinder';
import Footer from '../components/layout/Footer';
import ChatWidget from '../components/ui/ChatWidget';

export default function MainLayout() {
  return (
    <div className="app">
      <TopBar />
      <Header />
      <Navigation />
      <StickyFinder />
      <main>
        <Outlet />
      </main>
      <Footer />
      <ChatWidget />
    </div>
  );
}
