import { useRef, useState, useEffect } from 'react';
import { FaInstagram } from 'react-icons/fa6';
import './InstagramSection.css';

const posts = [
  { src: '/instagram/post1.mp4', href: 'https://www.instagram.com/elusive_racing/' },
  { src: '/instagram/post2.mp4', href: 'https://www.instagram.com/elusive_racing/' },
  { src: '/instagram/post3.mp4', href: 'https://www.instagram.com/elusive_racing/' },
  { src: '/instagram/post4.mp4', href: 'https://www.instagram.com/elusive_racing/' },
  { src: '/instagram/post5.mp4', href: 'https://www.instagram.com/elusive_racing/' },
  { src: '/instagram/post6.mp4', href: 'https://www.instagram.com/elusive_racing/' },
];

function ReelCard({ src, href, visible }) {
  const videoRef = useRef(null);

  const handleMouseEnter = () => videoRef.current?.play();

  const handleMouseLeave = () => {
    const v = videoRef.current;
    if (!v) return;
    v.pause();
    v.currentTime = 0;
  };

  return (
    <a
      className="reel-card"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="View on Instagram"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {visible ? (
        <video
          ref={videoRef}
          className="reel-video"
          src={src}
          muted
          playsInline
          loop
          preload="metadata"
        />
      ) : (
        <div className="reel-video reel-placeholder" />
      )}
      <div className="reel-overlay">
        <div className="reel-play-icon">
          <svg viewBox="0 0 24 24" fill="white" width="40" height="40">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
        <FaInstagram size={22} className="reel-ig-icon" />
      </div>
    </a>
  );
}

export default function InstagramSection() {
  const sectionRef = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="instagram-section" ref={sectionRef}>
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
        <p className="instagram-tagline">Follow us for builds, parts drops &amp; behind the scenes</p>
      </div>

      <div className="reel-wrapper">
        <div className="reel-track">
          {posts.map((post, i) => (
            <ReelCard key={i} {...post} visible={visible} />
          ))}
        </div>
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
