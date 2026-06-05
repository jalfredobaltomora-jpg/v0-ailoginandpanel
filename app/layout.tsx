import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const base = process.env.VERCEL === '1' ? '' : '/v0-ailoginandpanel';

export const metadata: Metadata = {
  title: 'SCA - JB',
  description: 'Sistema de Control Administrativo con IA',
  generator: 'v0.app',
  manifest: `${base}/manifest.json`,
  appleWebApp: {
    capable: true,
    title: 'SCA - JB',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: [
      { url: `${base}/icon-light-32x32.png`, media: '(prefers-color-scheme: light)' },
      { url: `${base}/icon-dark-32x32.png`, media: '(prefers-color-scheme: dark)' },
      { url: `${base}/icon.svg`, type: 'image/svg+xml' },
      { url: `${base}/icon-192x192.png`, sizes: '192x192', type: 'image/png' },
      { url: `${base}/icon-512x512.png`, sizes: '512x512', type: 'image/png' },
    ],
    apple: `${base}/apple-icon.png`,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className="bg-background">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="SCA - JB" />
        <meta name="msapplication-TileColor" content="#39474e" />
        <meta name="msapplication-TileImage" content={`${base}/icon-192x192.png`} />
        <meta name="theme-color" content="#39474e" />
      </head>
      <body className="font-sans antialiased bg-background text-foreground">
        {children}
        {process.env.VERCEL === '1' && <Analytics />}
        {base && <script dangerouslySetInnerHTML={{
          __html: `if('serviceWorker'in navigator)navigator.serviceWorker.register('${base}/sw.js')`,
        }} />}
      </body>
    </html>
  )
}
