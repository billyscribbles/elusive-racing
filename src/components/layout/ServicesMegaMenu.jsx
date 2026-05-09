import { Link } from 'react-router-dom';

export default function ServicesMegaMenu({ columns, footerLinks }) {
  const hasSplit = columns.some((col) => col.splitInto > 1);
  const totalSlots = columns.reduce((sum, col) => sum + (col.splitInto || 1), 0);
  const gridStyle = hasSplit
    ? { gridTemplateColumns: `repeat(${totalSlots}, minmax(0, 1fr))` }
    : undefined;

  return (
    <div className="mega-menu services-mega">
      <div className="container">
        <div
          className={`services-mega-grid${footerLinks?.length > 0 ? ' services-mega-grid--with-footer' : ''}`}
          style={gridStyle}
        >
          {columns.map((col) => (
            <div
              key={col.title}
              className={`services-mega-column${col.splitInto > 1 ? ' services-mega-column--split' : ''}`}
            >
              {col.image && (
                <Link to={col.titleHref} className="services-mega-image-link" aria-hidden="true" tabIndex={-1}>
                  <img src={col.image} alt="" loading="lazy" className="services-mega-image" />
                </Link>
              )}
              <h4 className="services-mega-title">{col.title}</h4>
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
              <Link to={col.titleHref} className="services-mega-viewall">
                View all {col.title.toLowerCase()}
                <span className="services-mega-viewall-arrow" aria-hidden="true">→</span>
              </Link>
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
