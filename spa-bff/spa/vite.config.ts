import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The SPA is served on :4000 and proxies /bff to the BFF (:4001) so the browser
// only ever sees one origin — the whole point of the BFF pattern. In Docker, nginx
// does the same proxying; this proxy is just for `npm run dev`.
export default defineConfig({
  plugins: [react()],
  server: { port: 4000, proxy: { "/bff": "http://localhost:4001" } },
  preview: { port: 4000 },
});
