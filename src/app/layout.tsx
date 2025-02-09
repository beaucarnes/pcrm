import './globals.css'
import { Inter } from 'next/font/google'
import SignInButton from './components/SignInButton'
import Link from 'next/link'
import Script from 'next/script'

const inter = Inter({ subsets: ['latin'] })

export const viewport = {
  themeColor: '#4f46e5',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
}

export const metadata = {
  title: 'Personal CRM',
  description: 'Manage your personal and professional relationships',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Personal CRM',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-48x48.png', sizes: '48x48', type: 'image/png' },
    ],
    shortcut: '/icons/icon-192x192.png',
    apple: '/icons/icon-192x192.png',
    other: [
      {
        rel: 'mask-icon',
        url: '/icons/icon-192x192.png',
        color: '#4f46e5'
      }
    ]
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#4f46e5" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon-16x16.png" sizes="16x16" type="image/png" />
        <link rel="icon" href="/favicon-32x32.png" sizes="32x32" type="image/png" />
        <link rel="icon" href="/favicon-48x48.png" sizes="48x48" type="image/png" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Personal CRM" />
        <style>
          {`
            @media all and (display-mode: standalone) {
              header {
                padding-top: env(safe-area-inset-top);
              }
              main {
                min-height: calc(100vh - env(safe-area-inset-top));
              }
            }
          `}
        </style>
      </head>
      <body className={inter.className}>
        <div className="min-h-screen bg-gray-300">
          <nav className="bg-white shadow">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="flex h-16 justify-between">
                <div className="flex">
                  <Link
                    href="/"
                    className="flex flex-shrink-0 items-center"
                  >
                    <span className="text-xl font-semibold text-indigo-600">Personal CRM</span>
                  </Link>

                </div>
                <div className="flex items-center">
                  <SignInButton />
                </div>
              </div>
            </div>
          </nav>
          <main>{children}</main>
        </div>
        <Script
          id="register-sw"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(registration) {
                      console.log('Service Worker registration successful');
                      
                      // Check for updates every hour
                      setInterval(() => {
                        registration.update();
                        
                        // Check version
                        const messageChannel = new MessageChannel();
                        messageChannel.port1.onmessage = (event) => {
                          if (event.data.version) {
                            console.log('Current version:', event.data.version);
                            // You can compare versions here and show update notification if needed
                          }
                        };
                        registration.active.postMessage('CHECK_VERSION', [messageChannel.port2]);
                      }, 3600000); // 1 hour
                    },
                    function(err) {
                      console.log('Service Worker registration failed: ', err);
                    }
                  );
                });
              }
            `,
          }}
        />
      </body>
    </html>
  )
} 