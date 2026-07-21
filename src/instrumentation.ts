export async function register() {
  // Runs once when the server boots (dev, start, and the Docker standalone
  // build). Restart any captures that were running before the last shutdown.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { resumeCaptures } = await import("./lib/capture-resume");
    resumeCaptures();
  }
}
