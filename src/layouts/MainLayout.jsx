import { Outlet } from 'react-router-dom';
import TopBar from '../components/layout/TopBar';
import Header from '../components/layout/Header';
import Navigation from '../components/layout/Navigation';
import Footer from '../components/layout/Footer';
import ChatWidget from '../components/ui/ChatWidget';

export default function MainLayout() {
  return (
    <div className="app">
      <TopBar />
      <Header />
      <Navigation />
      <main>
        <Outlet />
      </main>
      <Footer />
      <ChatWidget />
    </div>
  );
}
