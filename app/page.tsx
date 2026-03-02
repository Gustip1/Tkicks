import { FeaturedCarousels } from '@/components/landing/FeaturedCarousels';
import { NewArrivals } from '@/components/landing/NewArrivals';
import { HeroSection } from '@/components/landing/HeroSection';
import { CategoryShowcase } from '@/components/landing/CategoryShowcase';
import { SocialProofStrip } from '@/components/landing/SocialProofStrip';

export default function HomePage() {
  return (
    <div className="bg-black min-h-screen">
      {/* Hero — animated gradient, product marquee, strong CTA */}
      <HeroSection />

      {/* Anchor for scroll-down */}
      <div id="content-start" />

      {/* Social proof strip — trust signals */}
      <SocialProofStrip />

      {/* Category showcase — Sneakers / Streetwear cards */}
      <CategoryShowcase />

      {/* New Arrivals — product grid */}
      <div className="py-8 md:py-12">
        <NewArrivals />
      </div>

      {/* Featured Carousels — sales, featured sneakers/streetwear */}
      <div className="pb-12 md:pb-20">
        <FeaturedCarousels />
      </div>
    </div>
  );
}
