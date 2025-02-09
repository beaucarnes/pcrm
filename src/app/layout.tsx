import { Inter } from 'next/font/google'
import './globals.css'
import { metadata } from './metadata'
import Script from 'next/script'

const inter = Inter({ subsets: ['latin'] })

export { metadata }

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full bg-gray-200">
      <head>
        <Script
          src="https://upload-widget.cloudinary.com/global/all.js"
          strategy="beforeInteractive"
        />
      </head>
      <body className={`${inter.className} h-full bg-gray-200`}>
        <div className="min-h-full">
          {children}
        </div>
      </body>
    </html>
  )
} 