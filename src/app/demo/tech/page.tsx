import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "NovaTech — Premium Tech Gear for Developers & Creators",
  description: "NovaTech sells curated tech products for developers, designers, and content creators. Ultrabooks, 4K monitors, mechanical keyboards, ergonomic peripherals, and workspace accessories. Free shipping on orders over $99.",
};

export default function TechHome() {
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", maxWidth: 1100, margin: "0 auto", padding: "40px 24px" }}>
      <h1>NovaTech — Premium Tech Gear for Developers &amp; Creators</h1>
      <p>We curate the best tech products for people who build things. Every product is tested by our team of developers and designers before it makes the catalog.</p>

      <h2>Best Sellers</h2>
      <ul>
        <li><strong>UltraBook Pro 15</strong> ($1,899): 15.6" 4K OLED, Intel i9, 32GB RAM, 1TB SSD — built for code compilation and video editing</li>
        <li><strong>Studio NC700 Wireless Headphones</strong> ($349): ANC over-ear with 30-hour battery and multipoint Bluetooth 5.3</li>
        <li><strong>MechBoard 75 Keyboard</strong> ($149): Hot-swappable mechanical with gasket mount and aluminum frame</li>
        <li><strong>ProView 32 4K Monitor</strong> ($599): 32" IPS with 99% DCI-P3, USB-C PD 96W single-cable connection</li>
      </ul>

      <h2>Shop by Category</h2>
      <p><strong>Laptops</strong> — Ultrabooks and workstations from $999 to $2,499. All with minimum 16GB RAM, NVMe SSD, and Thunderbolt 4.</p>
      <p><strong>Monitors</strong> — 4K productivity and 240Hz gaming displays. USB-C hub monitors that replace your dock.</p>
      <p><strong>Audio</strong> — ANC headphones and earbuds for focused work and commuting.</p>
      <p><strong>Peripherals</strong> — Mechanical keyboards, ergonomic mice, 4K webcams.</p>
      <p><strong>Accessories</strong> — USB-C hubs, laptop stands, desk mats, chargers, smart home devices.</p>

      <h2>Why NovaTech</h2>
      <ul>
        <li>Every product tested by our dev team for 30+ days before listing</li>
        <li>Free shipping on orders over $99</li>
        <li>30-day no-questions returns</li>
        <li>Extended 3-year warranty on laptops and monitors</li>
        <li>Expert buying guides and comparison reviews on our blog</li>
      </ul>

      <h2>The NovaTech Blog</h2>
      <p>In-depth reviews, setup guides, and productivity tips. From "Best Mechanical Keyboards for Programmers 2026" to "How to Build a Dual-Monitor Developer Workspace Under $1500".</p>
    </div>
  );
}
