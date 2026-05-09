import { Link } from 'react-router-dom';

export default function ServicesMegaMenu({ columns, footerLinks }) {
  return (
    <div className="mega-menu services-mega">
      <div className="container">
        <div className={`services-mega-grid${footerLinks?.length > 0 ? ' services-mega-grid--with-footer' : ''}`}>
          {columns.map((col) => (
            <div key={col.title} className="services-mega-column">
              <h4 className="services-mega-title">{col.title}</h4>
              <Link to={col.titleHref} className="services-mega-viewall">
                View all {col.title.toLowerCase()}
                <span className="services-mega-viewall-arrow" aria-hidden="true">→</span>
              </Link>
              {col.links.length > 0 && (
                <ul className="services-mega-links">
                  {col.links.map((link) => (
                    <li key={link.href}>
                      <Link to={link.href} className="services-mega-link">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
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
