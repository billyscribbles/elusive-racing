import { useState, useRef, useEffect } from 'react';
import { navItems, featuredBrands } from '../../data/navigation';
import './Navigation.css';

function BrandsMegaMenu() {
  return (
    <div className="mega-menu brands-mega">
      <div className="container">
        <div className="brands-grid">
          {featuredBrands.map((brand) => (
            <a key={brand.name} href={brand.href} className="brand-item">
              <img
                src={brand.logo}
                alt={brand.name}
                loading="lazy"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.parentElement.querySelector('.brand-fallback').style.display = 'flex';
                }}
              />
              <span className="brand-fallback" style={{ display: 'none' }}>{brand.name}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

function StandardMegaMenu({ columns }) {
  return (
    <div className="mega-menu standard-mega">
      <div className="container">
        <div className="mega-columns" style={{ gridTemplateColumns: `repeat(${Math.min(columns.length, 4)}, 1fr)` }}>
          {columns.map((col, i) => (
            <div key={i} className="mega-column">
              {col.image && (
                <a href={col.imageHref} className="mega-col-image-link">
                  <img src={col.image} alt={col.title} loading="lazy" className="mega-col-image" />
                </a>
              )}
              <a href={col.titleHref} className="mega-col-title">{col.title}</a>
              <ul className="mega-col-links">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <a href={link.href} className="mega-col-link">{link.label}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SimpleDropdown({ links }) {
  return (
    <div className="simple-dropdown">
      {links.map((link) => (
        <a key={link.href} href={link.href} className="simple-dropdown-link">{link.label}</a>
      ))}
    </div>
  );
}

export default function Navigation() {
  const [activeItem, setActiveItem] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState(null);
  const navRef = useRef(null);
  const timeoutRef = useRef(null);

  const handleMouseEnter = (label) => {
    clearTimeout(timeoutRef.current);
    setActiveItem(label);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setActiveItem(null);
    }, 150);
  };

  useEffect(() => {
    return () => clearTimeout(timeoutRef.current);
  }, []);

  return (
    <>
      <nav className="nav" ref={navRef}>
        <div className="container nav-inner">
          <ul className="nav-list">
            {navItems.map((item) => (
              <li
                key={item.label}
                className={`nav-item ${activeItem === item.label ? 'nav-item--active' : ''}`}
                onMouseEnter={() => handleMouseEnter(item.label)}
                onMouseLeave={handleMouseLeave}
              >
                {item.hasMega ? (
                  <button className={`nav-link nav-link--btn${item.highlight ? ' nav-link--highlight' : ''}`}>
                    {item.label}
                    <svg className="nav-arrow" viewBox="0 0 10 6" fill="none">
                      <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                ) : (
                  <a href={item.href} className={`nav-link${item.highlight ? ' nav-link--highlight' : ''}`}>
                    {item.label}
                    {item.links && item.links.length > 0 && (
                      <svg className="nav-arrow" viewBox="0 0 10 6" fill="none">
                        <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </a>
                )}

                {activeItem === item.label && (
                  <div
                    className="dropdown-wrapper"
                    onMouseEnter={() => handleMouseEnter(item.label)}
                    onMouseLeave={handleMouseLeave}
                  >
                    {item.type === 'brands' && <BrandsMegaMenu />}
                    {item.type !== 'brands' && item.hasMega && item.columns && (
                      <StandardMegaMenu columns={item.columns} />
                    )}
                    {!item.hasMega && item.links && item.links.length > 0 && (
                      <SimpleDropdown links={item.links} />
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>

          <button
            className={`nav-hamburger ${mobileOpen ? 'nav-hamburger--open' : ''}`}
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="mobile-menu">
          <div className="mobile-menu-overlay" onClick={() => setMobileOpen(false)} />
          <div className="mobile-menu-panel">
            <div className="mobile-menu-header">
              <a href="/" className="mobile-menu-logo">
                <img src="/logo-main.svg" alt="Elusive Racing" height="32" />
              </a>
              <button className="mobile-menu-close" onClick={() => setMobileOpen(false)} aria-label="Close menu">
                <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            <ul className="mobile-menu-list">
              {navItems.map((item) => (
                <li key={item.label} className="mobile-menu-item">
                  <div className="mobile-menu-row">
                    {item.hasMega ? (
                      <span className="mobile-menu-link">{item.label}</span>
                    ) : (
                      <a href={item.href} className="mobile-menu-link">{item.label}</a>
                    )}
                    {(item.hasMega || (item.links && item.links.length > 0)) && (
                      <button
                        className="mobile-menu-expand"
                        onClick={() => setMobileExpanded(mobileExpanded === item.label ? null : item.label)}
                      >
                        <svg viewBox="0 0 10 6" fill="none" width="12" style={{ transform: mobileExpanded === item.label ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                          <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    )}
                  </div>
                  {mobileExpanded === item.label && item.columns && (
                    <div className="mobile-submenu">
                      {item.columns.map((col, i) => (
                        <div key={i} className="mobile-submenu-group">
                          <a href={col.titleHref} className="mobile-submenu-title">{col.title}</a>
                          {col.links.map((link) => (
                            <a key={link.href} href={link.href} className="mobile-submenu-link">{link.label}</a>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                  {mobileExpanded === item.label && !item.hasMega && item.links && (
                    <div className="mobile-submenu">
                      {item.links.map((link) => (
                        <a key={link.href} href={link.href} className="mobile-submenu-link">{link.label}</a>
                      ))}
                    </div>
                  )}
                </li>
              ))}
              <li className="mobile-menu-item mobile-menu-item--secondary">
                <a href="/wholesale-registration" className="mobile-menu-link">WHOLESALE</a>
              </li>
              <li className="mobile-menu-item mobile-menu-item--secondary">
                <a href="/my-account" className="mobile-menu-link">LOGIN / REGISTER</a>
              </li>
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
