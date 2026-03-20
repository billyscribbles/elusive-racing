import Hero from '../components/home/Hero';
import ServicesStrip from '../components/home/ServicesStrip';
import CategoryGrid from '../components/home/CategoryGrid';
import FeaturedProducts from '../components/home/FeaturedProducts';
import PromoStrip from '../components/home/PromoStrip';
import BrandsSection from '../components/home/BrandsSection';
import AboutBanner from '../components/home/AboutBanner';
import InstagramSection from '../components/home/InstagramSection';

export default function HomePage() {
  return (
    <>
      <Hero />
      <ServicesStrip />
      <CategoryGrid />
      <FeaturedProducts />
      <PromoStrip />
      <BrandsSection />
      <AboutBanner />
      <InstagramSection />
    </>
  );
}
