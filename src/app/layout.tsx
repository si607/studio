
import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import Script from 'next/script';

export const metadata: Metadata = {
  title: 'PicShine AI - Advanced Photo Enhancement',
  description: 'Transform your photos with AI-powered enhancement. Super-resolution, face enhancement, colorization and more.',
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
        {/* Existing Ad Script */}
        <Script async={true} data-cfasync="false" src="//pl26935397.profitableratecpm.com/242b734757198216a6ef5b94eae86475/invoke.js" strategy="lazyOnload" />
        {/* New Ad Script */}
        <Script type="text/javascript" src="//pl26935680.profitableratecpm.com/2e/32/93/2e3293b3df54f78268437bf3626a0e36.js" strategy="lazyOnload" />
      </head>
      <body className="font-body antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}

    

    