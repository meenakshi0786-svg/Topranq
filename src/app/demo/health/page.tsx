import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "VitalCore Nutrition — Supplements & Fitness Equipment",
  description: "VitalCore sells third-party tested supplements (whey protein, creatine, vitamins, adaptogens) and home fitness equipment (resistance bands, dumbbells, yoga mats). Science-backed formulas with transparent ingredient lists.",
};

export default function HealthHome() {
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", maxWidth: 1100, margin: "0 auto", padding: "40px 24px" }}>
      <h1>VitalCore Nutrition — Supplements &amp; Fitness Equipment</h1>
      <p>Science-backed supplements and functional fitness gear. Every formula is third-party tested, every ingredient dose is published. No proprietary blends, no artificial colors.</p>

      <h2>Best Sellers</h2>
      <ul>
        <li><strong>Pure Whey Protein Isolate — Vanilla (2kg)</strong>: 90% protein, 30g per scoop, 66 servings. Naturally flavored with real vanilla bean. $54.99</li>
        <li><strong>Micronized Creatine Monohydrate (500g)</strong>: Pure monohydrate, 5g/serving, 100 servings. The most researched supplement in sports science. $24.99</li>
        <li><strong>QuickLock Adjustable Dumbbells — 5-40kg</strong>: Replace 16 individual dumbbells. Turn-dial mechanism, 2.5kg increments. $299.99</li>
        <li><strong>KSM-66 Ashwagandha — 600mg</strong>: Clinically studied adaptogen for stress and cortisol management. 60-day supply. $21.99</li>
      </ul>

      <h2>Shop by Category</h2>
      <p><strong>Protein &amp; Recovery</strong> — Whey isolate, collagen peptides, electrolyte powder. For post-workout recovery and daily protein intake.</p>
      <p><strong>Performance</strong> — Creatine, pre-workout, and beta-alanine. Clinically dosed for measurable strength and endurance gains.</p>
      <p><strong>Health &amp; Wellness</strong> — Omega-3, Vitamin D3+K2, Magnesium Glycinate, Ashwagandha. Foundational supplements for sleep, immunity, and stress.</p>
      <p><strong>Equipment</strong> — Adjustable dumbbells, resistance bands, foam rollers, pull-up bars, yoga mats. Space-efficient home gym essentials.</p>
      <p><strong>Accessories</strong> — Insulated shaker bottles, gym bags, wrist wraps.</p>

      <h2>Our Standards</h2>
      <ul>
        <li>Every batch third-party tested by Informed Sport</li>
        <li>Full ingredient doses published — no proprietary blends</li>
        <li>No artificial colors, no unnecessary fillers</li>
        <li>Climate-neutral shipping</li>
        <li>Subscribe &amp; save 15% on supplements</li>
      </ul>
    </div>
  );
}
