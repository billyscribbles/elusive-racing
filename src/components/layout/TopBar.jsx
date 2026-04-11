import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import './TopBar.css';

const FaFacebook = ({ size = 18 }) => <svg width={size} height={size} viewBox="0 0 512 512" fill="currentColor"><path d="M512 256C512 114.6 397.4 0 256 0S0 114.6 0 256c0 120 82.7 220.8 194.2 248.5V334.2h-56.6V256h56.6v-33.7c0-105.1 46.4-152.3 149.4-152.3 19.4 0 52.8 3.8 66.5 7.6V148s-30.2-3.2-55.7-3.2c-56 0-77.8 21.2-77.8 76.4V256h89.6l-15.4 78.2H276.6v176.3C402.5 493.6 512 385.2 512 256z"/></svg>;
const FaInstagram = ({ size = 18 }) => <svg width={size} height={size} viewBox="0 0 448 512" fill="currentColor"><path d="M224.1 141c-63.6 0-114.9 51.3-114.9 114.9S160.5 370.9 224.1 370.9 339 319.5 339 255.9 287.7 141 224.1 141zm0 189.6c-41.1 0-74.7-33.5-74.7-74.7s33.5-74.7 74.7-74.7 74.7 33.5 74.7 74.7-33.6 74.7-74.7 74.7zm146.4-194.3c0 14.9-12 26.8-26.8 26.8-14.9 0-26.8-12-26.8-26.8s12-26.8 26.8-26.8 26.8 12 26.8 26.8zm76.1 27.2c-1.7-35.9-9.9-67.7-36.2-93.9-26.2-26.2-58-34.4-93.9-36.2-37-2.1-147.9-2.1-184.9 0-35.8 1.7-67.6 9.9-93.9 36.1s-34.4 58-36.2 93.9c-2.1 37-2.1 147.9 0 184.9 1.7 35.9 9.9 67.7 36.2 93.9s58 34.4 93.9 36.2c37 2.1 147.9 2.1 184.9 0 35.9-1.7 67.7-9.9 93.9-36.2 26.2-26.2 34.4-58 36.2-93.9 2.1-37 2.1-147.8 0-184.8zM398.8 388c-7.8 19.6-22.9 34.7-42.6 42.6-29.5 11.7-99.5 9-132.1 9s-102.7 2.6-132.1-9c-19.6-7.8-34.7-22.9-42.6-42.6-11.7-29.5-9-99.5-9-132.1s-2.6-102.7 9-132.1c7.8-19.6 22.9-34.7 42.6-42.6 29.5-11.7 99.5-9 132.1-9s102.7-2.6 132.1 9c19.6 7.8 34.7 22.9 42.6 42.6 11.7 29.5 9 99.5 9 132.1s2.7 102.7-9 132.1z"/></svg>;
const FaYoutube = ({ size = 18 }) => <svg width={size} height={size} viewBox="0 0 576 512" fill="currentColor"><path d="M549.7 124.1c-6.3-23.7-24.8-42.3-48.3-48.6C458.8 64 288 64 288 64S117.2 64 74.6 75.5c-23.5 6.3-42 24.9-48.3 48.6C14.9 167 14.9 256.4 14.9 256.4s0 89.4 11.4 132.3c6.3 23.7 24.8 41.5 48.3 47.8C117.2 448 288 448 288 448s170.8 0 213.4-11.5c23.5-6.3 42-24.2 48.3-47.8 11.4-42.9 11.4-132.3 11.4-132.3s0-89.4-11.4-132.3z"/></svg>;

export default function TopBar() {
  const navigate   = useNavigate();
  const { user, logout, isLoggedIn, isWholesale } = useAuthStore();
  const loggedIn   = isLoggedIn();
  const wholesale  = loggedIn && isWholesale();

  function handleLogout() {
    logout();
    navigate('/my-account');
  }

  return (
    <div className="topbar">
      <div className="container topbar-inner">

        {/* Left — social icons */}
        <div className="topbar-social">
          <a href="https://www.facebook.com/ElusiveRacin" target="_blank" rel="noopener noreferrer" className="topbar-social-link" aria-label="Facebook">
            <FaFacebook size={18} />
          </a>
          <a href="https://www.instagram.com/elusive_racing/" target="_blank" rel="noopener noreferrer" className="topbar-social-link" aria-label="Instagram">
            <FaInstagram size={18} />
          </a>
          <a href="https://www.youtube.com/@elusiveracing" target="_blank" rel="noopener noreferrer" className="topbar-social-link" aria-label="YouTube">
            <FaYoutube size={18} />
          </a>
        </div>

        {/* Right — account links */}
        <div className="topbar-right">
          <a href={wholesale ? '/my-account/dashboard' : '/wholesale-registration'} className="topbar-link">
            {wholesale ? 'WHOLESALE ORDERS' : 'WHOLESALE'}
          </a>
          <span className="topbar-divider">|</span>
          {loggedIn ? (
            <>
              <a href="/my-account/dashboard" className="topbar-link">
                Hi, {user.firstName}
              </a>
              <span className="topbar-divider">|</span>
              <button className="topbar-logout" onClick={handleLogout} aria-label="Sign out">
                <LogOut size={12} /> SIGN OUT
              </button>
            </>
          ) : (
            <a href="/my-account" className="topbar-link">LOGIN / REGISTER</a>
          )}
        </div>

      </div>
    </div>
  );
}
