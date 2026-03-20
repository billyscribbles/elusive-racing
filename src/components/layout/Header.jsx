import './Header.css';
import CartIcon from '../ui/CartIcon';
import SearchBar from '../ui/SearchBar';

export default function Header() {
  return (
    <header className="header">
      <div className="container header-inner">
        <a href="/" className="header-logo">
          <img
            src="/logo-main.svg"
            alt="Elusive Racing"
            className="logo-img"
          />
        </a>
        <div className="header-search">
          <SearchBar />
        </div>
        <div className="header-cart">
          <CartIcon />
        </div>
      </div>
    </header>
  );
}
