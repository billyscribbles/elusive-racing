import { useNavigate } from 'react-router-dom';
import { LogOut, Sun, Moon } from 'lucide-react';
import { getAdminUser, clearAdminAuth } from '../../lib/adminAuth';
import './AdminHeader.css';

export default function AdminHeader({ theme, onToggleTheme }) {
  const navigate = useNavigate();

  function handleLogout() {
    clearAdminAuth();
    navigate('/admin');
  }

  return (
    <header className="adm-header" data-admin-theme={theme}>
      <div className="adm-header-left">
        <img src="/logo-main.svg" alt="Elusive Racing" className="adm-logo" />
        <span className="adm-header-title">Admin</span>
      </div>
      <div className="adm-header-right">
        <span className="adm-user">{getAdminUser()}</span>
        <button className="adm-icon-btn" onClick={onToggleTheme} title="Toggle theme" aria-label="Toggle theme">
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <button className="adm-logout" onClick={handleLogout}>
          <LogOut size={15} /> Sign out
        </button>
      </div>
    </header>
  );
}
