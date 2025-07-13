
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Filters | PicShine AI',
  description: 'Apply creative, Snapchat-like AI filters to your photos. Transform your images with styles like Vintage, Neon, Sketch, and more.',
};

export default function FiltersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
