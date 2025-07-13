
"use client";

import React, { useState, useRef, ChangeEvent, DragEvent } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  UploadCloud,
  Sparkles,
  Loader2,
  Image as ImageIcon,
  Download,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Wand2,
  Info,
} from 'lucide-react';
import { applyFilter } from '@/ai/flows/apply-filter';

const FILTERS = [
  // Photographic Styles
  { name: "Vintage Film", description: "Gives photos an old-school, classic film look with faded colors and grain." },
  { name: "Golden Hour", description: "Bathes your photo in warm, soft, and glowing light, like just after sunrise." },
  { name: "Noir", description: "Creates a dramatic black-and-white style with high contrast, inspired by classic mystery films." },
  { name: "Infrared", description: "Simulates the look of infrared photography, often making foliage white and skies dark." },
  { name: "Cyanotype", description: "Applies a historic photographic printing process that produces a rich cyan-blue print." },
  // Artistic Styles
  { name: "Watercolor", description: "Transforms your image into a soft and vibrant watercolor painting." },
  { name: "Oil Painting", description: "Re-renders the photo with the thick, textured strokes of an oil painting." },
  { name: "Pencil Sketch", description: "Converts your photo into a detailed, hand-drawn pencil sketch." },
  { name: "Charcoal Art", description: "Creates a bold and expressive charcoal drawing with deep blacks and smudged textures." },
  { name: "Pop Art", description: "Applies a vibrant, high-contrast style inspired by the 1960s Pop Art movement." },
  { name: "Impressionism", description: "Reimagines your photo with the small, thin brush strokes of Impressionist painters." },
  // Modern & Abstract Styles
  { name: "Neon Punk", description: "Adds glowing neon lights and a futuristic, cyberpunk aesthetic to your image." },
  { name: "Holographic", description: "Gives the photo a shimmery, rainbow-like, and futuristic holographic effect." },
  { name: "Glitch Art", description: "Introduces digital errors and distortions for a modern, abstract tech look." },
  { name: "Double Exposure", description: "Blends your photo with another image (often nature) to create an artistic composite." },
  { name: "Origami World", description: "Reconstructs the scene as if it were made from folded paper origami." },
  { name: "Stained Glass", description: "Redraws your image in the style of a colorful stained glass window." },
  // Fun & Whimsical Styles
  { name: "Cartoonize", description: "Turns your photo into a fun and playful cartoon or comic book illustration." },
  { name: "Pixel Art", description: "Transforms your photo into retro 8-bit or 16-bit pixel art, like an old video game." },
  { name: "Toy Camera", description: "Mimics the look of a cheap plastic toy camera, with vignetting and light leaks." },
  { name: "Fantasy Glow", description: "Adds a magical and ethereal glow, perfect for creating a fantasy-like atmosphere." },
  { name: "Dreamy Haze", description: "Applies a soft, hazy, and blurry effect to give the photo a dream-like quality." }
];


export default function FiltersPage() {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [filteredImage, setFilteredImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [selectedFilter, setSelectedFilter] = useState<string>(FILTERS[0].name);
  const [fileName, setFileName] = useState<string | null>(null);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleImageUpload = (file: File | null) => {
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid File Type",
          description: "Please upload a valid image file (e.g., PNG, JPG, WEBP).",
          variant: "destructive",
        });
        return;
      }
      setFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setOriginalImage(reader.result as string);
        setFilteredImage(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    handleImageUpload(event.target.files?.[0] || null);
  };

  const handleDragOver = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(false);
    handleImageUpload(event.dataTransfer.files?.[0] || null);
  };
  
  const handleApplyFilter = async () => {
    if (!originalImage) {
      toast({ title: "No Image", description: "Please upload an image first.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setFilteredImage(null);
    setLoadingMessage(`Applying ${selectedFilter} filter...`);
    try {
      const result = await applyFilter({ photoDataUri: originalImage, filterName: selectedFilter });
      setFilteredImage(result.filteredPhotoDataUri);
      toast({
        title: "Filter Applied!",
        description: `The "${selectedFilter}" filter was successfully applied.`,
        icon: <CheckCircle2 className="h-5 w-5 text-green-400" />,
      });
    } catch (error: any) {
      console.error(`[ApplyFilter] Client-side error:`, error);
      toast({
        title: "Filter Failed",
        description: error.message || "An unknown error occurred.",
        variant: "destructive",
        icon: <AlertCircle className="h-5 w-5" />,
        duration: 10000,
      });
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  const handleDownload = () => {
    if (!filteredImage) return;
    const link = document.createElement('a');
    link.href = filteredImage;
    const downloadFileName = `picshine-filter-${selectedFilter.toLowerCase().replace(/\s/g, '_')}-${fileName || 'image'}.png`;
    link.download = downloadFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const ImageDisplay = ({ src, alt, placeholderText, isLoading, loadingText }: { src: string | null; alt: string; placeholderText: string; isLoading?: boolean; loadingText?: string }) => (
    <div className="relative w-full aspect-square bg-[rgba(var(--card-bg-rgb),0.3)] rounded-lg flex items-center justify-center overflow-hidden border border-[rgba(var(--card-border-rgb),0.15)] shadow-lg p-1">
      {src ? (
        <img src={src} alt={alt} className="max-h-full max-w-full object-contain rounded-md" />
      ) : (
        !isLoading && (
          <div className="flex flex-col items-center text-muted-foreground p-4 text-center">
            <ImageIcon size={48} className="mb-2 opacity-50" />
            <p>{placeholderText}</p>
          </div>
        )
      )}
      {isLoading && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white z-10">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="mt-4 text-center text-sm font-medium px-4">{loadingText}</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <header className="flex items-center justify-between mb-8">
            <Link href="/" legacyBehavior>
                <a className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <ArrowLeft size={16} />
                    Back to Main Enhancer
                </a>
            </Link>
             <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-primary-fallback rounded-md flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgb(var(--primary-start-rgb)), rgb(var(--primary-mid-rgb)), rgb(var(--primary-end-rgb)))'}}>
                    <Wand2 size={18} className="text-white" />
                </div>
                <span className="text-lg font-bold text-foreground">PicShine AI Filters Studio</span>
            </div>
            <div></div>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            {/* Left Column: Upload & Controls */}
            <div className="space-y-6">
                 <Card className="glass-card">
                    <CardHeader>
                        <CardTitle className="flex items-center text-xl">
                            <UploadCloud className="mr-3 h-6 w-6 text-primary" />
                            1. Upload Your Photo
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <label
                            htmlFor="imageUpload"
                            className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-xl cursor-pointer transition-colors
                                ${isDragging ? 'border-primary bg-primary/10' : 'border-border/20 hover:border-primary/50'}
                                bg-background/20`}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                        >
                            <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
                                <UploadCloud className="w-8 h-8 mb-3 text-muted-foreground" />
                                <p className="mb-2 text-sm text-muted-foreground">
                                    <span className="font-semibold text-foreground">Click to upload</span> or drag
                                </p>
                                <p className="text-xs text-muted-foreground">{fileName || "PNG, JPG, WEBP"}</p>
                            </div>
                            <Input id="imageUpload" type="file" className="hidden" accept="image/*" onChange={handleFileInputChange} ref={fileInputRef} />
                        </label>
                    </CardContent>
                </Card>

                 <Card className="glass-card">
                    <CardHeader>
                        <CardTitle className="flex items-center text-xl">
                            <Wand2 className="mr-3 h-6 w-6 text-primary" />
                            2. Choose a Filter
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                       <Select value={selectedFilter} onValueChange={setSelectedFilter}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select a filter" />
                          </SelectTrigger>
                          <SelectContent>
                            {FILTERS.map(filter => (
                              <SelectItem key={filter.name} value={filter.name}>
                                {filter.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button onClick={handleApplyFilter} disabled={!originalImage || isLoading} className="gradient-button w-full mt-4">
                            <Sparkles className="mr-2 h-5 w-5" /> Apply Filter
                        </Button>
                    </CardContent>
                </Card>

                <Card className="glass-card">
                    <CardHeader>
                        <CardTitle className="flex items-center text-xl">
                           <Info className="mr-3 h-6 w-6 text-primary" />
                            Filter Descriptions
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-60 w-full pr-4 overflow-y-auto">
                            <div className="space-y-4">
                                {FILTERS.map(filter => (
                                    <div key={filter.name}>
                                        <p className="font-semibold text-foreground">{filter.name}</p>
                                        <p className="text-sm text-muted-foreground">{filter.description}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Right Column: Image Previews */}
            <div className="space-y-6">
                <div className="space-y-2">
                     <h3 className="text-xl font-semibold text-center text-foreground">Original</h3>
                     <ImageDisplay src={originalImage} alt="Original" placeholderText="Upload an image to start" />
                </div>
                 <div className="space-y-2">
                     <h3 className="text-xl font-semibold text-center text-foreground">Filtered Image</h3>
                     <ImageDisplay src={filteredImage} alt="Filtered" placeholderText="Your filtered image will appear here" isLoading={isLoading} loadingText={loadingMessage} />
                </div>
                {filteredImage && (
                    <Button onClick={handleDownload} disabled={isLoading} variant="outline" className="w-full">
                        <Download className="mr-2 h-5 w-5" /> Download Filtered Image
                    </Button>
                )}
            </div>
        </section>
      </main>
    </div>
  );
}
