import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "All Products — NovaTech | Laptops, Monitors, Keyboards, Audio",
  description: "Browse NovaTech's full catalog of developer and creator tech. Ultrabooks, 4K monitors, mechanical keyboards, ANC headphones, ergonomic peripherals, and workspace accessories. 15 curated products.",
};

export default function Products() {
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", maxWidth: 1100, margin: "0 auto", padding: "40px 24px" }}>
      <h1>All Products</h1>
      <p>15 curated tech products, each tested by our team for 30+ days.</p>

      <h2>Laptops</h2>
      <p><strong>UltraBook Pro 15</strong> — $1,899. 15.6" 4K OLED, Intel i9-14900H, 32GB DDR5, 1TB NVMe. Thunderbolt 4. 12-hour battery. 1.4kg. For developers compiling large codebases and creators editing 4K video.</p>

      <h2>Monitors</h2>
      <p><strong>ProView 32 4K IPS</strong> — $599. 32" 4K, 99% DCI-P3, USB-C PD 96W. Height-adjustable. Built-in KVM for dual-PC setups. Ideal for design work and multi-window development.</p>
      <p><strong>GameSync 27 240Hz QHD</strong> — $449. 27" 2560x1440, 240Hz, 1ms GtG. HDMI 2.1, G-Sync + FreeSync. HDR600. For competitive gaming and fast-paced content.</p>

      <h2>Audio</h2>
      <p><strong>Studio NC700 Wireless Headphones</strong> — $349. 40mm drivers, ANC, 30-hour battery, Bluetooth 5.3 multipoint. Premium memory foam. For deep work and travel.</p>
      <p><strong>NC Earbuds — Titanium</strong> — $199. Hybrid ANC, 10mm titanium drivers, 8h + 32h case, IPX5, spatial audio. For workouts and commuting.</p>

      <h2>Peripherals</h2>
      <p><strong>MechBoard 75 Keyboard</strong> — $149. 75% layout, hot-swappable, RGB, aluminum frame, gasket-mount. USB-C + Bluetooth. The keyboard developers keep recommending.</p>
      <p><strong>ErgoGlide Vertical Mouse</strong> — $69. 57° angle, 4000 DPI, 6 buttons, USB-C rechargeable (3-month battery). Prevents wrist strain for all-day coding.</p>
      <p><strong>ClearView 4K Webcam</strong> — $129. Sony STARVIS sensor, auto-focus, AI background blur, dual mics with noise cancellation. For meetings and streaming.</p>

      <h2>Accessories</h2>
      <p><strong>7-in-1 USB-C Hub</strong> — $59. HDMI 4K@60Hz, 2x USB-A, USB-C PD 100W, SD/microSD, Ethernet. One cable for everything.</p>
      <p><strong>AeroStand Laptop Riser</strong> — $45. 6 height positions, aluminum, foldable, up to 17". Pairs with an external keyboard for ergonomic posture.</p>
      <p><strong>FlashDrive Pro 2TB SSD</strong> — $179. 2000MB/s, IP55, 58g, hardware encryption. For video editors and photographers on location.</p>
      <p><strong>Qi2 Wireless Charger</strong> — $39. 15W MagSafe compatible. LED indicator, auto-shutoff, works through 5mm cases.</p>
      <p><strong>TravelCell 20K Power Bank</strong> — $79. 65W USB-C PD (charges laptops), dual USB-C + USB-A. Airline-approved.</p>
      <p><strong>Premium Desk Mat</strong> — $35. 900x400mm merino felt, non-slip rubber base, water-resistant.</p>
      <p><strong>Smart Plug 4-Pack</strong> — $49. WiFi + Matter. Alexa, Google Home, HomeKit. Energy monitoring per plug.</p>
    </div>
  );
}
