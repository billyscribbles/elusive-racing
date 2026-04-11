import { useRef, useState, useEffect } from 'react';
import './InstagramSection.css';

const FaInstagram = ({ size = 18, className }) => <svg width={size} height={size} viewBox="0 0 448 512" fill="currentColor" className={className}><path d="M224.1 141c-63.6 0-114.9 51.3-114.9 114.9S160.5 370.9 224.1 370.9 339 319.5 339 255.9 287.7 141 224.1 141zm0 189.6c-41.1 0-74.7-33.5-74.7-74.7s33.5-74.7 74.7-74.7 74.7 33.5 74.7 74.7-33.6 74.7-74.7 74.7zm146.4-194.3c0 14.9-12 26.8-26.8 26.8-14.9 0-26.8-12-26.8-26.8s12-26.8 26.8-26.8 26.8 12 26.8 26.8zm76.1 27.2c-1.7-35.9-9.9-67.7-36.2-93.9-26.2-26.2-58-34.4-93.9-36.2-37-2.1-147.9-2.1-184.9 0-35.8 1.7-67.6 9.9-93.9 36.1s-34.4 58-36.2 93.9c-2.1 37-2.1 147.9 0 184.9 1.7 35.9 9.9 67.7 36.2 93.9s58 34.4 93.9 36.2c37 2.1 147.9 2.1 184.9 0 35.9-1.7 67.7-9.9 93.9-36.2 26.2-26.2 34.4-58 36.2-93.9 2.1-37 2.1-147.8 0-184.8zM398.8 388c-7.8 19.6-22.9 34.7-42.6 42.6-29.5 11.7-99.5 9-132.1 9s-102.7 2.6-132.1-9c-19.6-7.8-34.7-22.9-42.6-42.6-11.7-29.5-9-99.5-9-132.1s-2.6-102.7 9-132.1c7.8-19.6 22.9-34.7 42.6-42.6 29.5-11.7 99.5-9 132.1-9s102.7-2.6 132.1 9c19.6 7.8 34.7 22.9 42.6 42.6 11.7 29.5 9 99.5 9 132.1s2.7 102.7-9 132.1z"/></svg>;

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
