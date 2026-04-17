export async function register() {
  // Only run on the server, not during build
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Delay to let the server fully start before running background checks
    setTimeout(async () => {
      try {
        const { checkAndFixInterlinks } = await import("./lib/interlink-check");
        await checkAndFixInterlinks();
        console.log("[startup] Interlink check complete");
      } catch (err) {
        console.warn("[startup] Interlink check failed:", err);
      }
    }, 5000);
  }
}
