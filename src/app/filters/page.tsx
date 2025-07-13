
"use client";

import React, { useState, useRef, ChangeEvent, DragEvent } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
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
} from 'lucide-react';
import { applyFilter } from '@/ai/flows/apply-filter';
import { cn } from '@/lib/utils';

const FILTERS = [
  // Photographic Styles
  { name: "Vintage Film", hint: "vintage film" },
  { name: "Golden Hour", hint: "golden hour" },
  { name: "Noir", hint: "noir film" },
  { name: "Infrared", hint: "infrared photo" },
  { name: "Cyanotype", hint: "cyanotype print" },
  // Artistic Styles
  { name: "Watercolor", hint: "watercolor painting" },
  { name: "Oil Painting", hint: "oil painting" },
  { name: "Pencil Sketch", hint: "pencil sketch" },
  { name: "Charcoal Art", hint: "charcoal drawing" },
  { name: "Pop Art", hint: "pop art" },
  { name: "Impressionism", hint: "impressionist painting" },
  // Modern & Abstract Styles
  { name: "Neon Punk", hint: "neon punk" },
  { name: "Holographic", hint: "holographic futuristic" },
  { name: "Glitch Art", hint: "glitch art" },
  { name: "Double Exposure", hint: "double exposure" },
  { name: "Origami World", hint: "origami world" },
  { name: "Stained Glass", hint: "stained glass" },
  // Fun & Whimsical Styles
  { name: "Cartoonize", hint: "cartoon style" },
  { name: "Pixel Art", hint: "pixel art" },
  { name: "Toy Camera", hint: "toy camera" },
  { name: "Fantasy Glow", hint: "fantasy glow" },
  { name: "Dreamy Haze", hint: "dreamy haze" }
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
          <div className="flex flex-col items-center text-[rgb(var(--muted-foreground))] p-4 text-center">
            <ImageIcon size={48} className="mb-2 opacity-50" />
            <p>{placeholderText}</p>
          </div>
        )
      )}
      {isLoading && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white z-10">
          <Loader2 className="h-10 w-10 animate-spin text-[rgb(var(--primary-start-rgb))]" />
          <p className="mt-4 text-center text-sm font-medium px-4">{loadingText}</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-[rgb(var(--foreground))]">
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <header className="flex items-center justify-between mb-8">
            <Link href="/" legacyBehavior>
                <a className="flex items-center gap-2 text-sm text-[rgb(var(--muted-foreground))] hover:text-[rgb(var(--foreground))] transition-colors">
                    <ArrowLeft size={16} />
                    Back to Main Enhancer
                </a>
            </Link>
             <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-primary-fallback rounded-md flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #4D3DF4 0%, #AB3FFB 50%, #1E90FF 100%)'}}>
                    <Wand2 size={18} className="text-white" />
                </div>
                <span className="text-lg font-bold text-[rgb(var(--foreground))]">PicShine AI Filters Studio</span>
            </div>
            <div></div>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            {/* Left Column: Upload & Controls */}
            <div className="space-y-6">
                 <Card className="glass-card">
                    <CardHeader>
                        <CardTitle className="flex items-center text-xl">
                            <UploadCloud className="mr-3 h-6 w-6 text-[rgb(var(--primary-start-rgb))]" />
                            1. Upload Your Photo
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <label
                            htmlFor="imageUpload"
                            className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-xl cursor-pointer transition-colors
                                ${isDragging ? 'border-[rgb(var(--primary-start-rgb))] bg-[rgba(var(--primary-start-rgb),0.1)]' : 'border-[rgba(var(--card-border-rgb),0.2)] hover:border-[rgba(var(--primary-start-rgb),0.5)]'}
                                bg-[rgba(var(--card-bg-rgb),0.2)]`}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                        >
                            <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
                                <UploadCloud className="w-8 h-8 mb-3 text-[rgb(var(--muted-foreground))]" />
                                <p className="mb-2 text-sm text-[rgb(var(--muted-foreground))]">
                                    <span className="font-semibold text-[rgb(var(--foreground))]">Click to upload</span> or drag
                                </p>
                                <p className="text-xs text-[rgb(var(--muted-foreground))]">{fileName || "PNG, JPG, WEBP"}</p>
                            </div>
                            <Input id="imageUpload" type="file" className="hidden" accept="image/*" onChange={handleFileInputChange} ref={fileInputRef} />
                        </label>
                    </CardContent>
                </Card>

                 <Card className="glass-card">
                    <CardHeader>
                        <CardTitle className="flex items-center text-xl">
                            <Wand2 className="mr-3 h-6 w-6 text-[rgb(var(--primary-start-rgb))]" />
                            2. Choose a Filter
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                       <ScrollArea className="w-full">
                            <div className="flex space-x-4 pb-4">
                                {FILTERS.map(filter => (
                                    <div
                                        key={filter.name}
                                        className="flex flex-col items-center gap-2 cursor-pointer group"
                                        onClick={() => setSelectedFilter(filter.name)}
                                    >
                                        <div className={cn(
                                            "relative w-20 h-20 rounded-full overflow-hidden transition-all duration-300 border-2 border-transparent group-hover:scale-105",
                                            selectedFilter === filter.name ? "border-[rgb(var(--primary-start-rgb))] ring-2 ring-offset-2 ring-offset-background ring-[rgb(var(--primary-start-rgb))]" : "border-[rgba(var(--card-border-rgb),0.2)]"
                                        )}>
                                            <img
                                                src={`https://placehold.co/100x100.png`}
                                                alt={`${filter.name} preview`}
                                                width={100}
                                                height={100}
                                                data-ai-hint={filter.hint}
                                                className="object-cover w-full h-full"
                                            />
                                            {selectedFilter === filter.name && (
                                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                                  <CheckCircle2 className="text-white h-8 w-8" />
                                              </div>
                                            )}
                                        </div>
                                        <p className={cn(
                                            "text-xs font-medium text-center transition-colors",
                                            selectedFilter === filter.name ? "text-[rgb(var(--foreground))]" : "text-[rgb(var(--muted-foreground))] group-hover:text-[rgb(var(--foreground))]"
                                        )}>
                                            {filter.name}
                                        </p>
                                    </div>
                                ))}
                            </div>
                            <ScrollBar orientation="horizontal" />
                        </ScrollArea>
                        <Button onClick={handleApplyFilter} disabled={!originalImage || isLoading} className="gradient-button w-full mt-4">
                            <Sparkles className="mr-2 h-5 w-5" /> Apply Filter
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Right Column: Image Previews */}
            <div className="space-y-6">
                <div className="space-y-2">
                     <h3 className="text-xl font-semibold text-center text-[rgb(var(--foreground))]">Original</h3>
                     <ImageDisplay src={originalImage} alt="Original" placeholderText="Upload an image to start" />
                </div>
                 <div className="space-y-2">
                     <h3 className="text-xl font-semibold text-center text-[rgb(var(--foreground))]">Filtered Image</h3>
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

    