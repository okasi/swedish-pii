/** @type {import('next').NextConfig} */

// The GitHub Pages build (see .github/workflows/pages.yml) produces a
// fully static export served from /swedish-pii/. The demo page masks
// client-side, so no API routes are needed there; regular builds keep
// the POST /api/mask route.
const isGithubPages = process.env.GITHUB_PAGES === "true";

const nextConfig = {
  ...(isGithubPages && {
    output: "export",
    basePath: "/swedish-pii",
    images: { unoptimized: true },
  }),
};

export default nextConfig;
