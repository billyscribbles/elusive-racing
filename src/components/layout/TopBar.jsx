import { FaFacebook, FaInstagram, FaYoutube } from 'react-icons/fa6';
import './TopBar.css';

export default function TopBar() {
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
          <a href="/my-account" className="topbar-link">LOGIN / REGISTER</a>
        </div>

      </div>
    </div>
  );
}
