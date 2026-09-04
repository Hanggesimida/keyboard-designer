import createNextIntlPlugin from "next-intl/plugin"

const withNextIntl = createNextIntlPlugin()

const redirectedSources = [
  "/login/:path*",
  "/register",
  "/profile/:path*",
  "/checkout",
  "/admin/:path*",
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@workspace/ui"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ik.imagekit.io",
        pathname: "/lrigu76hy/**",
      },
    ],
  },
  async redirects() {
    return [
      ...redirectedSources.map((source) => ({
        source,
        destination: "/design",
        permanent: false,
      })),
      ...redirectedSources.map((source) => ({
        source: `/zh${source}`,
        destination: "/zh/design",
        permanent: false,
      })),
    ]
  },
}

export default withNextIntl(nextConfig)
