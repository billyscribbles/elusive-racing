import { Link } from 'react-router-dom';

export default function ServicesMegaMenu({ columns, footerLinks }) {
  return (
    <div className="mega-menu services-mega">
      <div className="container">
        <div className="services-mega-grid">
          {columns.map((col) => (
            <div key={col.title} className="services-mega-column">
              <Link to={col.titleHref} className="services-mega-title">
                <span>{col.title}</span>
                <span className="services-mega-title-arrow" aria-hidden="true">→</span>
              </Link>
              <ul className="services-mega-links">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link to={link.href} className="services-mega-link">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        {footerLinks?.length > 0 && (
          <div className="services-mega-footer">
            {footerLinks.map((link) => (
              <Link key={link.href} to={link.href} className="services-mega-footer-link">
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
