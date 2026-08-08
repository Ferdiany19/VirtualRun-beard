/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    localPatterns: [
      {
        pathname: "/assets/**",
      },
      {
        pathname: "/events/**",
      },
      {
        pathname: "/api/admin/bib/template-preview",
      },
      {
        pathname: "/api/admin/submission-file/download",
      },
      {
        pathname: "/api/admin/certificates/template-preview",
      },
    ],
  },
  async rewrites() {
    const apiBaseUrl =
      process.env.NEXT_PUBLIC_API_BASE_URL ??
      process.env.INTERNAL_API_BASE_URL ??
      "http://127.0.0.1:3001";

    return [
      {
        source: "/api/:path*",
        destination: `${apiBaseUrl}/api/:path*`,
      },
    ];
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;
