import Hero from "../components/home/Hero";
import StickyFinder from "../components/layout/StickyFinder";
import ServicesStrip from "../components/home/ServicesStrip";
import CategoryGrid from "../components/home/CategoryGrid";
import FeaturedProducts from "../components/home/FeaturedProducts";
import BrandsSection from "../components/home/BrandsSection";
import AboutBanner from "../components/home/AboutBanner";
import InstagramSection from "../components/home/InstagramSection";

export default function HomePage() {
  return (
    <>
      <StickyFinder />
      <Hero />
      <ServicesStrip />
      <CategoryGrid />
      <FeaturedProducts />
      <AboutBanner />
      <BrandsSection />
      <InstagramSection />
    </>
  );
}
