/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['cdn.shopify.com'], // <-- aggiungi qui il dominio giusto
  },
};

module.exports = nextConfig;