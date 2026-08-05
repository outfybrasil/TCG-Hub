import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'TCG Megastore',
    short_name: 'TCG Mega',
    description: 'Marketplace, preços e leilões ao vivo de TCG.',
    start_url: '/',
    display: 'standalone',
    background_color: '#070d1f',
    theme_color: '#e11d48',
    orientation: 'portrait-primary',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
