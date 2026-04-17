import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Collections — Atelier Lune | Monthly Capsule Releases",
  description: "Browse Atelier Lune's current and past capsule collections. Limited edition women's fashion designed in Paris. Silk dresses, linen blazers, cashmere knitwear. 50-100 pieces per capsule.",
};

export default function Collections() {
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", maxWidth: 1100, margin: "0 auto", padding: "40px 24px" }}>
      <h1>Capsule Collections</h1>
      <p>Each month, Atelier Lune releases a themed capsule of 50-100 pieces. Once they sell out, they don&apos;t return. Here are our current and recent collections.</p>

      <h2>Autumn Luxe 2026 (Current)</h2>
      <p>Rich textures meet Parisian minimalism. Cashmere, wool, and silk in a warm earth-tone palette. 15 pieces designed for layering from office to evening.</p>
      <ul>
        <li>Silk Wrap Dress — Midnight Blue (€129)</li>
        <li>Cashmere Turtleneck — Camel (€145)</li>
        <li>Wool Blend Belted Coat — Charcoal (€189)</li>
        <li>Oversized Linen Blazer — Sand (€89)</li>
        <li>Pleated Midi Skirt — Dusty Rose (€59)</li>
      </ul>

      <h2>Summer Ease 2026</h2>
      <p>Breathable linen and cotton in soft pastels. Palazzo pants, shirt dresses, and lightweight layering pieces for warm-weather elegance. 12 pieces, all under €100.</p>
      <ul>
        <li>Tailored Shirt Dress — White (€79)</li>
        <li>Cotton Palazzo Pants — Olive (€55)</li>
        <li>Satin Camisole — Champagne (€45)</li>
        <li>Classic Denim Jacket — Medium Wash (€75)</li>
      </ul>

      <h2>How Capsule Collections Work</h2>
      <p>We design 50-100 pieces per capsule, produced in a single run at our partner atelier in Porto, Portugal. No restocking, no overproduction. When a size sells out, it&apos;s gone. Subscribe to our newsletter for early access — capsules typically sell out within 10 days of launch.</p>

      <h2>Accessories Collection (Permanent)</h2>
      <p>Unlike our seasonal capsules, our accessories line is permanently available:</p>
      <ul>
        <li>Mini Leather Crossbody Bag — Black (€95)</li>
        <li>Gold Statement Earrings — Geometric (€35)</li>
        <li>Silk Scarf — Floral Print (€65)</li>
        <li>Pointed Ankle Boots — Tan Leather (€139)</li>
      </ul>
    </div>
  );
}
