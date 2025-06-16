"use client";

import React, { useState, ChangeEvent, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { UploadCloud, Wand2, RotateCcw, Loader2, Image as ImageIcon } from 'lucide-react';
import { enhanceImage } from '@/ai/flows/enhance-image';
import NextImage from 'next/image'; // Using NextImage for optimized images where appropriate

export default function ImageEnhancerPage() {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [enhancedImage, setEnhancedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Basic validation for image type (optional, can be expanded)
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid File Type",
          description: "Please upload a valid image file (e.g., PNG, JPG, GIF).",
          variant: "destructive",
        });
        if (fileInputRef.current) {
            fileInputRef.current.value = ""; // Reset file input
        }
        return;
      }

      setFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setOriginalImage(reader.result as string);
        setEnhancedImage(null); // Reset enhanced image on new upload
      };
      reader.onerror = () => {
        toast({
          title: "File Read Error",
          description: "Could not read the selected file.",
          variant: "destructive",
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEnhanceImage = async () => {
    if (!originalImage) {
      toast({
        title: "No Image",
        description: "Please upload an image first.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await enhanceImage({ photoDataUri: originalImage });
      setEnhancedImage(result.enhancedPhotoDataUri);
      toast({
        title: "Success!",
        description: "Your image has been enhanced.",
      });
    } catch (error) {
      console.error("Error enhancing image:", error);
      let errorMessage = "Could not enhance the image. Please try again.";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast({
        title: "Enhancement Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setOriginalImage(null);
    setEnhancedImage(null);
    setFileName(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = ""; // Reset file input
    }
  };

  const ImageDisplay = ({ src, alt, placeholderText }: { src: string | null, alt: string, placeholderText: string }) => (
    <div className="aspect-video bg-muted/50 rounded-lg flex items-center justify-center overflow-hidden border border-border shadow-sm transition-all duration-300 hover:shadow-md">
      {src ? (
        // Using standard img for data URIs as next/image might have issues with rapidly changing large data URIs
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className="max-h-full max-w-full object-contain p-1" />
      ) : (
        <div className="flex flex-col items-center text-muted-foreground p-4 text-center">
          <ImageIcon size={48} className="mb-2 opacity-50" />
          <p>{placeholderText}</p>
        </div>
      )}
    </div>
  );

  return (
    <main className="flex flex-col items-center justify-start min-h-screen bg-background p-4 sm:p-6 md:p-8 font-body">
      <Card className="w-full max-w-4xl shadow-2xl rounded-xl overflow-hidden bg-card mt-8 mb-8">
        <CardHeader className="text-center bg-primary text-primary-foreground p-6 sm:p-8">
          <div className="flex items-center justify-center mb-2">
            <Wand2 size={32} className="mr-3 sm:size-40" />
            <CardTitle className="text-2xl sm:text-3xl font-headline">Remini AI Enhanced</CardTitle>
          </div>
          <CardDescription className="text-primary-foreground/90 text-sm sm:text-base">
            Upload your image and let our AI magically enhance its quality.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 md:p-10 space-y-8">
          <div className="space-y-4">
            <label
              htmlFor="imageUpload"
              className="flex flex-col items-center justify-center w-full h-48 sm:h-56 border-2 border-dashed border-accent rounded-lg cursor-pointer bg-card hover:bg-accent/10 transition-colors duration-200"
              aria-busy={isLoading}
              aria-disabled={isLoading}
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <UploadCloud className="w-10 h-10 sm:w-12 sm:h-12 mb-3 text-muted-foreground" />
                <p className="mb-2 text-sm text-muted-foreground">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-muted-foreground">PNG, JPG, GIF, WEBP</p>
                {fileName && !isLoading && <p className="text-xs text-primary-foreground/80 mt-2 bg-accent/50 px-2 py-1 rounded">Selected: {fileName}</p>}
                {isLoading && <p className="text-xs text-primary-foreground/80 mt-2">Processing: {fileName}</p>}
              </div>
              <Input id="imageUpload" type="file" className="hidden" accept="image/*" onChange={handleImageUpload} ref={fileInputRef} disabled={isLoading} />
            </label>

            {isLoading && (
              <div className="flex flex-col items-center justify-center space-y-3 p-4">
                <Loader2 className="h-10 w-10 sm:h-12 sm:w-12 animate-spin text-primary-foreground" />
                <p className="text-sm text-center text-muted-foreground">Enhancing your image, please wait...</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 items-start">
            <div className="space-y-3">
              <h3 className="text-lg sm:text-xl font-headline text-center text-foreground">Original Image</h3>
              <ImageDisplay src={originalImage} alt="Original" placeholderText="Upload an image to see it here." />
            </div>
            <div className="space-y-3">
              <h3 className="text-lg sm:text-xl font-headline text-center text-foreground">Enhanced Image</h3>
              <ImageDisplay src={enhancedImage} alt="Enhanced" placeholderText="Your AI-enhanced image will appear here." />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-4">
            <Button
              onClick={handleEnhanceImage}
              disabled={!originalImage || isLoading}
              className="w-full sm:w-auto text-base px-6 py-3 sm:px-8 sm:py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105 bg-primary-foreground text-primary hover:bg-opacity-90"
              aria-label="Enhance uploaded image"
            >
              <Wand2 className="mr-2 h-5 w-5" /> Enhance Image
            </Button>
            <Button
              onClick={handleReset}
              variant="outline"
              disabled={isLoading && (!originalImage && !enhancedImage)}
              className="w-full sm:w-auto text-base px-6 py-3 sm:px-8 sm:py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105 border-primary-foreground/50 text-primary-foreground hover:bg-accent/20"
              aria-label="Reset images and selection"
            >
              <RotateCcw className="mr-2 h-5 w-5" /> Reset
            </Button>
          </div>

        </CardContent>
      </Card>
      <footer className="text-center py-8 text-muted-foreground text-sm">
        <p>&copy; {new Date().getFullYear()} Remini AI Enhanced. All rights reserved.</p>
        <p>Powered by cutting-edge AI technology.</p>
      </footer>
    </main>
  );
}
