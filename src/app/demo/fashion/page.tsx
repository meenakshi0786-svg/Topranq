import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Atelier Lune — Parisian Women's Fashion | Capsule Collections",
  description: "Atelier Lune offers curated capsule collections of women's clothing and accessories. Silk dresses, linen blazers, cashmere knitwear, and leather accessories designed in Paris. New capsule every month, 50-100 pieces in limited edition.",
};

export default function FashionHome() {
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", maxWidth: 1100, margin: "0 auto", padding: "40px 24px" }}>
      <h1>Atelier Lune — Parisian Women&apos;s Fashion</h1>
      <p>Curated capsule collections designed in Paris. Each month, we release 50-100 pieces in limited edition — once sold out, they don&apos;t come back.</p>

      <h2>Our Collections</h2>
      <p>Every Atelier Lune capsule is built around a styling theme: layering for autumn, effortless summer linen, or evening silk. Each piece is designed to mix with your existing wardrobe.</p>

      <h3>Current Capsule: Autumn Luxe 2026</h3>
      <ul>
        <li><strong>Silk Wrap Dress — Midnight Blue</strong> (€129): Luxurious silk wrap with V-neckline and adjustable waist tie</li>
        <li><strong>Oversized Linen Blazer — Sand</strong> (€89): Relaxed-fit single-button blazer for layering</li>
        <li><strong>Cashmere Turtleneck — Camel</strong> (€145): 100% cashmere with ribbed cuffs, essential for winter</li>
        <li><strong>High-Waist Wide-Leg Trousers — Ivory</strong> (€69): Crepe fabric, pressed crease, office-to-weekend</li>
        <li><strong>Wool Blend Belted Coat — Charcoal</strong> (€189): Double-breasted with horn buttons, fully lined</li>
      </ul>

      <h2>Why Atelier Lune</h2>
      <ul>
        <li>Designed in Paris, ethically produced in Portugal</li>
        <li>Natural fabrics: silk, linen, cashmere, wool, cotton</li>
        <li>Limited runs of 50-100 pieces per style</li>
        <li>Price range: €35 — €189</li>
        <li>Free shipping in France, flat-rate €9.90 EU delivery</li>
        <li>14-day returns with free return shipping</li>
      </ul>

      <h2>Style Guides</h2>
      <p>Our blog covers seasonal styling, capsule wardrobe building, fabric care guides, and outfit inspiration. From work-to-weekend transitions to evening layering techniques.</p>

      <h2>Shop Categories</h2>
      <p>Dresses | Blazers &amp; Jackets | Trousers | Knitwear | Tops | Skirts | Coats | Bags &amp; Accessories | Shoes | Scarves</p>
    </div>
  );
}
