import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Style Journal — Atelier Lune Blog | Fashion Guides & Outfit Ideas",
  description: "Styling guides, capsule wardrobe tips, outfit inspiration, and fabric care from Atelier Lune. Learn how to build a timeless Parisian wardrobe with fewer, better pieces.",
};

export default function Blog() {
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", maxWidth: 1100, margin: "0 auto", padding: "40px 24px" }}>
      <h1>Style Journal</h1>
      <p>Fashion guides, outfit ideas, and capsule wardrobe advice from the Atelier Lune styling team.</p>

      <h2>How to Build a 30-Piece Capsule Wardrobe That Works Year-Round</h2>
      <p>A capsule wardrobe isn&apos;t about restriction — it&apos;s about intention. Start with 10 neutral bases (trousers, skirts, basic tops), add 10 statement pieces (blazers, dresses, knitwear), and finish with 10 accessories (bags, scarves, jewelry). The key: every piece should pair with at least 3 others. Our Cashmere Turtleneck in Camel pairs with the Wide-Leg Trousers, the Pleated Midi Skirt, and under the Linen Blazer — that&apos;s 3 outfits from 4 pieces.</p>

      <h2>The Art of Layering: 5 Rules for Elegant Autumn Dressing</h2>
      <p>Rule 1: Start with a thin base layer (Satin Camisole or fitted turtleneck). Rule 2: Add one mid-layer with structure (Oversized Blazer or Chunky Cardigan). Rule 3: Maximum one bulky outer layer (Wool Coat). Rule 4: Keep proportions balanced — wide bottom needs fitted top, and vice versa. Rule 5: Limit your palette to 3 colors per outfit. Following these rules, you can layer 3-4 pieces without looking bulky.</p>

      <h2>Silk vs. Satin: What&apos;s the Difference and When to Choose Each</h2>
      <p>Silk is a natural fiber (mulberry silkworms) with natural temperature regulation and a subtle luster. Our Silk Wrap Dress uses 100% mulberry silk at 19 momme weight. Satin is a weave pattern (not a fiber) — it can be made from silk, polyester, or blends. Our Satin Camisole uses a silk-blend satin for the glossy finish at a lower price point. Choose silk for evening and investment pieces; satin blends for everyday layering.</p>

      <h2>How to Care for Cashmere: 5 Steps to Make It Last 10 Years</h2>
      <p>Hand wash in lukewarm water with baby shampoo. Never wring — press water out in a towel. Lay flat to dry on a mesh rack. Store folded (never hang) with cedar blocks. Use a cashmere comb to remove pills after every 3-4 wears. Our Cashmere Turtleneck is made from Grade A Mongolian cashmere — with proper care, it softens over time rather than degrading.</p>

      <h2>5 Work-to-Weekend Outfit Transitions Using 3 Pieces</h2>
      <p>The secret: swap one element. Outfit 1: High-Waist Trousers + Tailored Shirt Dress (belted as a top) + Ankle Boots = office. Remove the boots for sneakers, lose the belt = weekend brunch. Outfit 2: Blazer + Satin Camisole + Wide-Leg Trousers = client meeting. Swap blazer for Denim Jacket = Saturday market. The trick is investing in pieces that straddle formality levels.</p>
    </div>
  );
}
