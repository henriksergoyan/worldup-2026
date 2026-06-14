/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["bcryptjs", "xlsx"],
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
