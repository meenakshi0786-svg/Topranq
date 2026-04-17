import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fitness Blog — VitalCore | Supplement Guides & Workout Tips",
  description: "Evidence-based supplement guides, workout programming, and nutrition tips. Creatine dosing, protein timing, home gym setups, and recovery strategies backed by sports science research.",
};

export default function HealthBlog() {
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", maxWidth: 1100, margin: "0 auto", padding: "40px 24px" }}>
      <h1>VitalCore Fitness Blog</h1>
      <p>Evidence-based guides on supplements, training, and nutrition. No broscience — every claim linked to peer-reviewed research.</p>

      <h2>Creatine Monohydrate: The Complete 2026 Guide (Dosing, Timing, Loading)</h2>
      <p>Creatine monohydrate is the most researched supplement in sports science with over 500 peer-reviewed studies. Effective dose: 3-5g daily. Loading phase (20g/day for 5 days) saturates muscles faster but isn&apos;t required. Timing doesn&apos;t matter — consistency does. Take with a meal for slightly better absorption. Our Micronized Creatine (500g, $24.99) provides 100 days at 5g/day. Common myth: creatine doesn&apos;t cause hair loss (the single study suggesting this has never been replicated).</p>

      <h2>How Much Protein Do You Actually Need? The Science-Based Answer</h2>
      <p>Meta-analyses consistently show 1.6-2.2g protein per kg bodyweight per day for muscle growth. For a 75kg person: 120-165g daily. Spread across 3-4 meals with 30-40g each. Whole foods first, supplement the gap. Our Whey Isolate delivers 30g per scoop with minimal lactose and no artificial sweeteners. Timing around workouts matters less than total daily intake — the &quot;anabolic window&quot; is actually 24+ hours, not 30 minutes.</p>

      <h2>Build a Complete Home Gym for Under $500</h2>
      <p>You need exactly 4 things: adjustable dumbbells ($299.99 — replaces 16 individual dumbbells), a pull-up bar ($29.99 — doorway mount, no drilling), resistance bands ($34.99 — 5 levels for warm-ups and accessory work), and a yoga mat ($44.99 — doubles as a floor exercise surface). Total: $409.96. This setup covers every major movement pattern: push, pull, squat, hinge, carry. Add a foam roller ($24.99) for recovery. You don&apos;t need a bench — floor press and Bulgarian split squats are equally effective.</p>

      <h2>Ashwagandha for Stress: What the Research Actually Shows</h2>
      <p>KSM-66 ashwagandha at 600mg/day has been shown in 6 RCTs to reduce cortisol by 15-27% and improve subjective stress scores. Effects take 4-8 weeks to appear. Best taken in the evening for sleep quality benefits. Our KSM-66 capsules ($21.99, 60-day supply) use the same extract and dose used in the clinical trials. Note: ashwagandha can interact with thyroid medication — consult your doctor if you&apos;re on levothyroxine.</p>

      <h2>The 5 Supplements Actually Worth Taking (And 5 That Are Waste of Money)</h2>
      <p>Worth it: 1) Creatine monohydrate — strongest evidence base in sports nutrition. 2) Vitamin D3 — most people are deficient, especially above 35° latitude. 3) Omega-3 — EPA/DHA for cardiovascular and brain health. 4) Magnesium glycinate — 50% of adults don&apos;t meet the RDA. 5) Whey protein — practical, not magical. Not worth it: BCAAs (redundant if you eat enough protein), testosterone boosters (don&apos;t work), fat burners (caffeine with markup), collagen for muscle (whey is better), multivitamins (test and supplement specific deficiencies instead).</p>
    </div>
  );
}
