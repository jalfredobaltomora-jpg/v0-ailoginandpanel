import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

export const metadata: Metadata = {
  title: 'SCA - JB',
  description: 'Sistema de Control Administrativo con IA',
  generator: 'v0.app',
  manifest: '/v0-ailoginandpanel/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'SCA - JB',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: [
      { url: '/v0-ailoginandpanel/icon-light-32x32.png', media: '(prefers-color-scheme: light)' },
      { url: '/v0-ailoginandpanel/icon-dark-32x32.png', media: '(prefers-color-scheme: dark)' },
      { url: '/v0-ailoginandpanel/icon.svg', type: 'image/svg+xml' },
      { url: '/v0-ailoginandpanel/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/v0-ailoginandpanel/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/v0-ailoginandpanel/apple-icon.png',
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
        <meta name="msapplication-TileImage" content="/v0-ailoginandpanel/icon-192x192.png" />
        <meta name="theme-color" content="#39474e" />
      </head>
      <body className="font-sans antialiased bg-background text-foreground">
        {children}
        {process.env.VERCEL === '1' && <Analytics />}
        <script dangerouslySetInnerHTML={{
          __html: `if('serviceWorker'in navigator)navigator.serviceWorker.register('/v0-ailoginandpanel/sw.js')`,
        }} />
      </body>
    </html>
  )
}
