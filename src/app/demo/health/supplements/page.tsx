import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Supplements — VitalCore | Protein, Vitamins, Adaptogens",
  description: "Browse VitalCore's full supplement range: whey protein isolate, creatine monohydrate, omega-3 fish oil, vitamin D3+K2, magnesium glycinate, ashwagandha KSM-66, collagen peptides, pre-workout, and electrolytes. All third-party tested.",
};

export default function Supplements() {
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", maxWidth: 1100, margin: "0 auto", padding: "40px 24px" }}>
      <h1>Supplements</h1>
      <p>Every VitalCore supplement uses clinically studied doses, transparent labeling, and third-party testing by Informed Sport.</p>

      <h2>Protein &amp; Recovery</h2>
      <p><strong>Pure Whey Protein Isolate — Vanilla (2kg)</strong> — $54.99. 90% protein content, 30g per scoop, minimal lactose. Naturally flavored with real vanilla bean. No artificial sweeteners. 66 servings.</p>
      <p><strong>Marine Collagen Peptides — Unflavored (400g)</strong> — $34.99. Type I &amp; III from wild-caught fish. 10g per serving. Dissolves in hot or cold. Supports skin, joints, and gut. 40 servings.</p>
      <p><strong>HydroCharge Electrolyte Powder — Citrus (40 sachets)</strong> — $22.99. Zero sugar. Sodium, potassium, magnesium, zinc. For post-workout, heat, and fasting recovery.</p>

      <h2>Strength &amp; Performance</h2>
      <p><strong>Micronized Creatine Monohydrate (500g)</strong> — $24.99. 5g/serving, 100 servings. The single most researched supplement in sports science. Supports muscle strength, power, and recovery.</p>
      <p><strong>NitroCharge Pre-Workout — Berry Blast (300g)</strong> — $39.99. 200mg caffeine, 6g citrulline malate, 3.2g beta-alanine, 2.5g betaine. Clinically dosed. 30 servings.</p>

      <h2>Health &amp; Wellness</h2>
      <p><strong>Omega-3 Fish Oil — Triple Strength (120 softgels)</strong> — $29.99. 1000mg EPA + 500mg DHA per softgel. Wild-caught, molecular distilled. Enteric-coated. 60-day supply.</p>
      <p><strong>Vitamin D3 + K2 (120 capsules)</strong> — $16.99. 4000 IU D3 + 100mcg K2 (MK-7). Coconut oil base for absorption. 120-day supply.</p>
      <p><strong>Magnesium Glycinate — 400mg (90 capsules)</strong> — $19.99. Chelated for max absorption. Supports sleep, muscle relaxation, stress. Gentle on stomach. 90-day supply.</p>
      <p><strong>KSM-66 Ashwagandha — 600mg (60 capsules)</strong> — $21.99. Full-spectrum root extract, 5% withanolides. Clinically studied for cortisol reduction and sleep quality.</p>
    </div>
  );
}
