
import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import Script from 'next/script';

export const metadata: Metadata = {
  title: 'PicShine AI - Advanced Photo Enhancement',
  description: 'Transform your photos with PicShine AI, the ultimate AI photo enhancer. Instantly upscale, colorize, remove scratches, and restore your images to stunning quality.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        {children}
        <Toaster />
        
        {/* New Ad Scripts */}
        <Script id="ad-config-script" strategy="afterInteractive">
          {`
            atOptions = {
              'key' : '043edf1829a1a2d00841ff62bf429f10',
              'format' : 'iframe',
              'height' : 250,
              'width' : 300,
              'params' : {}
            };
          `}
        </Script>
        <Script
          strategy="afterInteractive"
          src="//www.highperformanceformat.com/043edf1829a1a2d00841ff62bf429f10/invoke.js"
        />
        <Script
          strategy="afterInteractive"
          src="//pl26935680.profitableratecpm.com/2e/32/93/2e3293b3df54f78268437bf3626a0e36.js"
        />
      </body>
    </html>
  );
}
