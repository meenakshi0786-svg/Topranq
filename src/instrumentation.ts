export async function register() {
  // Startup hooks can be added here
  if (process.env.NEXT_RUNTIME === "nodejs") {
    console.log("[startup] Server ready");
  }
}
