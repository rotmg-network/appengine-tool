export function backendDownMessage(status?: number): string {
  const statusNote = status ? ` (proxy responded ${status})` : "";
  return (
    `Could not reach the backend proxy server on http://127.0.0.1:8787${statusNote}.\n\n` +
    "The web UI forwards every request through that proxy, so it must be running.\n" +
    "Start it with one of:\n" +
    "  • npm start        (builds the UI and runs the proxy + web server together)\n" +
    "  • npm run dev      (proxy + Vite dev server)\n" +
    "  • npm run dev:proxy (proxy only, if the web server is already running)\n\n" +
    "Once it is up, press Retry below."
  );
}
