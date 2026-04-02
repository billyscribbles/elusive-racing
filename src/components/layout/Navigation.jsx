import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, X } from 'lucide-react';
import { navItems, featuredBrands, vehicleData } from '../../data/navigation';
import CartIcon from '../ui/CartIcon';
import useAuthStore from '../../store/authStore';
import useVehicleStore from '../../store/vehicleStore';
import './Navigation.css';

function MobileAuthLink() {
  const navigate   = useNavigate();
  const { user, logout, isLoggedIn } = useAuthStore();
  const loggedIn   = isLoggedIn();

  function handleLogout() { logout(); navigate('/my-account'); }

  if (loggedIn) {
    return (
      <>
        <li className="mobile-menu-item mobile-menu-item--secondary">
          <a href="/my-account/dashboard" className="mobile-menu-link">MY ACCOUNT</a>
        </li>
        <li className="mobile-menu-item mobile-menu-item--secondary">
          <button className="mobile-menu-link mobile-menu-link--btn" onClick={handleLogout}>
            SIGN OUT ({user?.firstName})
          </button>
        </li>
      </>
    );
  }
  return (
    <li className="mobile-menu-item mobile-menu-item--secondary">
      <a href="/my-account" className="mobile-menu-link">LOGIN / REGISTER</a>
    </li>
  );
}

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
        <div className="brands-mega-footer">
          <a href="/brands" className="brands-see-all">See all brands →</a>
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

// Map sub-category labels to /menu/ images
const SUB_IMAGES = {
  // Engine
  'Engine Internals':          '/menu/menu-engine-parts.jpg',
  'Engine Parts':               '/menu/menu-engine-parts.jpg',
  'Exhaust':                    '/menu/menu-headers.jpg',
  'Fuel':                       '/menu/menu-fuel.jpg',
  'Induction':                  '/menu/menu-induction.jpg',
  'Maintenance':                '/menu/menu-maintenacne.jpg',
  'Turbo & Supercharger':       '/menu/menu-sway-turbo.jpg',
  // Suspension
  'Coilovers':                  '/menu/menu-coilovers.jpg',
  'Springs':                    '/menu/menu-springs.jpg',
  'Suspension Arms':            '/menu/menu-susoension-arms.jpg',
  'Sway Bars':                  '/menu/menu-sway-bars.jpg',
  'Sway Bar Bushes':            '/menu/menu-sway-bar-bushes.jpg',
  'Bars & Braces':              '/menu/menu-brace.jpg',
  'Bushing':                    '/menu/menu-bushes.jpg',
  'Ball Joints':                '/menu/menu-ball-joint.jpg',
  'Chassis Braces':             '/menu/menu-chasis.jpg',
  'Stabilizer Link':            '/menu/menu-stabilizer-.jpg',
  'Tie Rods & Ends':            '/menu/menu-tie-end-link.jpg',
  'Hub':                        '/menu/menu-hub.jpg',
  'Accessories':                '/menu/menu-accesories.jpg',
  // Honda OEM
  'Engine':                     '/menu/menu-honda-engine.jpg',
  'Drivetrain':                 '/menu/menu-honda-drivetrain.jpg',
  'Body & Accessories':         '/menu/menu-honda-body.jpg',
  // Interior
  'Steering Wheels':            '/menu/menu-master.jpg',
  'Seat & Rails':               '/menu/menu-seat.jpg',
  'Shift Knobs':                '/menu/menu-shift-knob-2.jpg',
  'Shifters':                   '/menu/menu-shifters.jpg',
  'Quick Release & Hub/Boss Kits': '/menu/menu-quick-release.jpg',
  'Cables & Accessories':       '/menu/menu-cables-accessories.jpg',
  'X Bar & Braces':             '/menu/menu-brace.jpg',
  // Drivetrain
  'Clutch & Flywheel':          '/menu/menu-clutch.jpg',
  'Clutch Lines':               '/menu/menu-clutch-lines.jpg',
  'Cylinders & Slave':          '/menu/menu-master.jpg',
  'Driveshafts':                '/menu/menu-driveshaft.jpg',
  'Gearbox Gears & Synchros':   '/menu/menu-synchros.jpg',
  'Gearbox Seals & Bearings':   '/menu/menu-bearings.jpg',
  'Gears / Final Drives & LSD': '/menu/menu-lsd.jpg',
  'Oil & Lubrication':          '/menu/menu-drivetrain-lubricants.jpg',
  // Brakes
  'Brake Pads':                 '/menu/menu-brake-pads.jpg',
  'Rotors':                     '/menu/menu-rotors.jpg',
  'Brake Kits':                 '/menu/menu-kits.jpg',
  'Brake Lines':                '/menu/menu-brake-lines.jpg',
  'Oil & Lubricants':           '/menu/menu-brake-fluid.jpg',
  // Exterior
  'Aerodynamics':               '/menu/menu-aero.jpg',
  'Body Panels':                '/menu/menu-honda-body.jpg',
  'Engine Bay':                 '/menu/menu-honda-engine.jpg',
  'Lights & Indicators':        '/menu/menu-lights.jpg',
  'Mirrors':                    '/menu/menu-mirror.jpg',
  'Trims & Seals':              '/menu/menu-trim.jpg',
  'Wheel Nuts':                 '/menu/menu-nuts.jpg',
  // Electronics
  'ECU & Converters':           '/menu/menu-ecu.jpg',
  'Gauges':                     '/menu/menu-gauges.jpg',
  'Sensors':                    '/menu/menu-sensor.jpg',
  'Spark Plugs':                '/menu/menu-spark-plugs.jpg',
  'Boost Controller':           '/menu/menu-boost-controller.jpg',
  'Wiring Harnesses':           '/menu/menu-wiring-harness.jpg',
  // Cooling
  'Radiators & Overflow Bottles': '/menu/menu-radiator.jpg',
  'Intercooler':                '/menu/menu-intercooler.jpg',
  'Oil Coolers':                '/menu/menu-oil-cooler.jpg',
  'Thermostat & Housing':       '/menu/menu-thermo.jpg',
  'Upper Coolant Housings':     '/menu/menu-upper-coolant.jpg',
  'Water Pump & Plate Kits':    '/menu/menu-water-pump.jpg',
  'Fans, Hose & Accessories':   '/menu/menu-fans.jpg',
  // Merchandise
  'Hoodies & Jackets':          '/menu/menu-hoodie.jpg',
  'T-Shirts':                   '/menu/menu-shirt.jpg',
  'Caps':                       '/menu/menu-caps.jpg',
  // Lighting
  'LED':                        '/menu/menu-led.jpg',
  'Tail / Brake':               '/menu/menu-lighting.jpg',
  // Clearance
  'Used Parts':                 '/menu/menu-maintenacne.jpg',
};

function TileDropdown({ links, parentHref }) {
  return (
    <div className="tile-dropdown">
      <div className="container">
        <div className="tile-dropdown-grid">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="tile-dropdown-item"
              style={{ '--tile-img': `url(${SUB_IMAGES[link.label] ?? '/menu/menu-accesories.jpg'})` }}
            >
              <span className="tile-dropdown-overlay" />
              <span className="tile-dropdown-label">{link.label}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Navigation() {
  const [activeItem, setActiveItem] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState(null);
  const navigate = useNavigate();
  const [vehicleOpen, setVehicleOpen] = useState(false);
  const { make: vMake, model: vModel, year: vYear, setVehicle, clearVehicle } = useVehicleStore();
  const vModels = vMake ? (vehicleData.models[vMake] || []) : [];

  const handleVehicleSubmit = () => {
    if (!vMake) return;
    const params = new URLSearchParams();
    params.set('make', vMake);
    if (vModel) params.set('model', vModel);
    if (vYear) params.set('year', vYear);
    navigate(`/search?${params.toString()}`);
    setVehicleOpen(false);
  };
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
      <nav className="nav" ref={navRef} onMouseLeave={handleMouseLeave}>
        <div className="container nav-inner">
          <ul className="nav-list">
            {navItems.map((item) => (
              <li
                key={item.label}
                className={`nav-item ${activeItem === item.label ? 'nav-item--active' : ''}`}
                onMouseEnter={() => handleMouseEnter(item.label)}
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
                  <div className="dropdown-wrapper">
                    {item.type === 'brands' && <BrandsMegaMenu />}
                    {item.type !== 'brands' && item.hasMega && item.columns && (
                      <StandardMegaMenu columns={item.columns} />
                    )}
                    {!item.hasMega && item.links && item.links.length > 0 && (
                      <TileDropdown links={item.links} />
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>

          {/* Mobile bar: hamburger | vehicle btn | cart */}
          <div className="mobile-bar">
            <button
              className={`nav-hamburger ${mobileOpen ? 'nav-hamburger--open' : ''}`}
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              <span></span>
              <span></span>
              <span></span>
            </button>
            <button
              className={`mobile-vehicle-btn ${vehicleOpen ? 'mobile-vehicle-btn--active' : ''} ${vMake ? 'mobile-vehicle-btn--saved' : ''}`}
              onClick={() => setVehicleOpen(!vehicleOpen)}
            >
              {vMake ? [vMake, vModel, vYear].filter(Boolean).join(' ') : 'Select Your Vehicle'}
              <ChevronDown size={13} strokeWidth={2.5} className="mobile-vehicle-chevron" />
            </button>
            <div className="mobile-bar-cart">
              <CartIcon />
            </div>
          </div>
        </div>

        {/* Vehicle selector panel (mobile only) */}
        {vehicleOpen && (
          <div className="mobile-vehicle-panel">
            <div className="container mobile-vehicle-grid">
              <select
                className="mobile-vehicle-select"
                value={vMake}
                onChange={e => setVehicle(e.target.value, '', '')}
              >
                <option value="">Select Make</option>
                {vehicleData.makes.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <select
                className="mobile-vehicle-select"
                value={vModel}
                onChange={e => setVehicle(vMake, e.target.value, '')}
                disabled={!vMake}
              >
                <option value="">Select Model</option>
                {vModels.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <select
                className="mobile-vehicle-select mobile-vehicle-select--full"
                value={vYear}
                onChange={e => setVehicle(vMake, vModel, e.target.value)}
                disabled={!vModel}
              >
                <option value="">Year / Submodel</option>
                {vehicleData.years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              {vMake && (
                <button
                  className="mobile-vehicle-remove"
                  onClick={() => { clearVehicle(); setVehicleOpen(false); }}
                >
                  <X size={13} />
                  Remove Vehicle
                </button>
              )}
              <button
                className="mobile-vehicle-go"
                onClick={handleVehicleSubmit}
                disabled={!vMake}
              >
                Search Parts
              </button>
            </div>
          </div>
        )}
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
                  <div
                    className="mobile-menu-row"
                    onClick={(item.hasMega || (item.links && item.links.length > 0))
                      ? () => setMobileExpanded(mobileExpanded === item.label ? null : item.label)
                      : undefined}
                    style={(item.hasMega || (item.links && item.links.length > 0)) ? { cursor: 'pointer' } : undefined}
                  >
                    {item.hasMega ? (
                      <span className="mobile-menu-link">{item.label}</span>
                    ) : (
                      <a href={item.href} className="mobile-menu-link" onClick={(e) => e.stopPropagation()}>{item.label}</a>
                    )}
                    {(item.hasMega || (item.links && item.links.length > 0)) && (
                      <button className="mobile-menu-expand" aria-label="Toggle">
                        <svg viewBox="0 0 10 6" fill="none" width="12" style={{ transform: mobileExpanded === item.label ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                          <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    )}
                  </div>
                  {mobileExpanded === item.label && item.type === 'brands' && (
                    <div className="mobile-submenu mobile-brands-panel">
                      <div className="mobile-brands-grid">
                        {featuredBrands.slice(0, 8).map((brand) => (
                          <a
                            key={brand.name}
                            href={brand.href}
                            className="mobile-brand-item"
                            onClick={() => setMobileOpen(false)}
                            style={{ '--brand-logo': `url(${brand.logo})` }}
                          >
                            <span className="mobile-brand-name">{brand.name}</span>
                          </a>
                        ))}
                      </div>
                      <a href="/brands" className="mobile-brands-all" onClick={() => setMobileOpen(false)}>
                        View All Brands →
                      </a>
                    </div>
                  )}
                  {mobileExpanded === item.label && item.type !== 'brands' && item.columns && (
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
              <MobileAuthLink />
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
