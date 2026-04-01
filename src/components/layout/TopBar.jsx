import { FaFacebook, FaInstagram, FaYoutube } from 'react-icons/fa6';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import './TopBar.css';

export default function TopBar() {
  const navigate   = useNavigate();
  const { user, logout, isLoggedIn } = useAuthStore();
  const loggedIn   = isLoggedIn();

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
          <a href="/wholesale-registration" className="topbar-link">WHOLESALE</a>
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
