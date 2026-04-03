import { Helmet } from "react-helmet-async";
import Hero from "../components/home/Hero";
import StickyFinder from "../components/layout/StickyFinder";
import ServicesStrip from "../components/home/ServicesStrip";
import CategoryGrid from "../components/home/CategoryGrid";
import FeaturedProducts from "../components/home/FeaturedProducts";
import BrandsSection from "../components/home/BrandsSection";
import AboutBanner from "../components/home/AboutBanner";
import PromoBanner from "../components/home/PromoBanner";
import InstagramSection from "../components/home/InstagramSection";
import {
  DEFAULT_TITLE,
  DEFAULT_DESC,
  DEFAULT_IMAGE,
  SITE_URL,
  schemaLocalBusiness,
  schemaWebSite,
} from "../lib/seo";

export default function HomePage() {
  return (
    <>
      <Helmet>
        <title>{DEFAULT_TITLE}</title>
        <meta name="description" content={DEFAULT_DESC} />
        <link rel="canonical" href={SITE_URL} />

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={SITE_URL} />
        <meta property="og:title" content={DEFAULT_TITLE} />
        <meta property="og:description" content={DEFAULT_DESC} />
        <meta property="og:image" content={DEFAULT_IMAGE} />
        <meta property="og:locale" content="en_AU" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={DEFAULT_TITLE} />
        <meta name="twitter:description" content={DEFAULT_DESC} />
        <meta name="twitter:image" content={DEFAULT_IMAGE} />

        {/* JSON-LD */}
        <script type="application/ld+json">
          {JSON.stringify(schemaLocalBusiness())}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(schemaWebSite())}
        </script>
      </Helmet>

      <StickyFinder />
      <PromoBanner />
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
