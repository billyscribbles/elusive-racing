import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import './TopBar.css';

const BrandIcon = ({ src, size = 18 }) => (
  <img src={src} alt="" width={size} height={size} className="topbar-brand-icon" loading="lazy" />
);

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
            <BrandIcon src="/icons/facebook.svg" />
          </a>
          <a href="https://www.instagram.com/elusive_racing/" target="_blank" rel="noopener noreferrer" className="topbar-social-link" aria-label="Instagram">
            <BrandIcon src="/icons/instagram.svg" />
          </a>
          <a href="https://www.youtube.com/@elusiveracing99" target="_blank" rel="noopener noreferrer" className="topbar-social-link" aria-label="YouTube">
            <BrandIcon src="/icons/youtube.svg" />
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
