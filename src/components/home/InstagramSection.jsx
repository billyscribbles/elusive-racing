import { FaInstagram } from 'react-icons/fa6';
import './InstagramSection.css';

// Placeholder posts — replace with Instagram Graph API data when ready
const posts = [
  {
    id: 1,
    image: 'https://elusiveracing.com.au/wp-content/uploads/menu-clutch.jpg',
    href: 'https://www.instagram.com/elusive_racing/',
  },
  {
    id: 2,
    image: 'https://elusiveracing.com.au/wp-content/uploads/menu-honda-engine.jpg',
    href: 'https://www.instagram.com/elusive_racing/',
  },
  {
    id: 3,
    image: 'https://elusiveracing.com.au/wp-content/uploads/menu-lsd.jpg',
    href: 'https://www.instagram.com/elusive_racing/',
  },
  {
    id: 4,
    image: 'https://elusiveracing.com.au/wp-content/uploads/menu-driveshaft.jpg',
    href: 'https://www.instagram.com/elusive_racing/',
  },
  {
    id: 5,
    image: 'https://elusiveracing.com.au/wp-content/uploads/menu-synchros.jpg',
    href: 'https://www.instagram.com/elusive_racing/',
  },
  {
    id: 6,
    image: 'https://elusiveracing.com.au/wp-content/uploads/menu-honda-drivetrain.jpg',
    href: 'https://www.instagram.com/elusive_racing/',
  },
];

export default function InstagramSection() {
  return (
    <section className="instagram-section">
      <div className="instagram-header">
        <a
          href="https://www.instagram.com/elusive_racing/"
          target="_blank"
          rel="noopener noreferrer"
          className="instagram-handle"
        >
          <FaInstagram size={24} />
          <span>@elusive_racing</span>
        </a>
        <p className="instagram-tagline">Follow us for builds, parts drops & behind the scenes</p>
      </div>

      <div className="instagram-grid">
        {posts.map((post) => (
          <a
            key={post.id}
            href={post.href}
            target="_blank"
            rel="noopener noreferrer"
            className="instagram-tile"
          >
            <img src={post.image} alt="" loading="lazy" className="instagram-tile-img" />
            <div className="instagram-tile-overlay">
              <FaInstagram size={28} color="#fff" />
            </div>
          </a>
        ))}
      </div>

      <div className="instagram-cta">
        <a
          href="https://www.instagram.com/elusive_racing/"
          target="_blank"
          rel="noopener noreferrer"
          className="instagram-follow-btn"
        >
          <FaInstagram size={18} />
          Follow on Instagram
        </a>
      </div>
    </section>
  );
}
