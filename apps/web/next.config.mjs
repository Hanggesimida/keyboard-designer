/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@workspace/ui"],
  async redirects() {
    return [
      "/login/:path*",
      "/register",
      "/profile/:path*",
      "/checkout",
      "/admin/:path*",
    ].map((source) => ({
      source,
      destination: "/design",
      permanent: false,
    }))
  },
}

export default nextConfig
