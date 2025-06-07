/** @type {import('next').NextConfig} */
const nextConfig = {
  // ADICIONE ESTA CONFIGURAÇÃO DE IMAGENS
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3001', // A porta do seu backend
        pathname: '/uploads/**', // Permite qualquer caminho dentro da pasta /uploads
      },
    ],
  },
};

module.exports = nextConfig;