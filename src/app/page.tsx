
"use client";

import React, { useState, ChangeEvent, useRef, useEffect, DragEvent, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { UploadCloud, Sparkles, RotateCcw, Loader2, Image as ImageIcon, Download, Palette, Star, AlertTriangle, Brush, History as HistoryIcon, Camera, Zap, CheckCircle2, Info, AlertCircle, Layers, Settings2, ShieldCheck, Crown } from 'lucide-react';
import { smartEnhanceImage } from '@/ai/flows/smart-enhance-image';
import { colorizeImage } from '@/ai/flows/colorize-image';
import { removeScratches } from '@/ai/flows/remove-scratches';

const DAILY_LIMIT = 30;
const HISTORY_LIMIT = 5;
const WARNING_THRESHOLD = 5;

interface HistoryItem {
  id: string;
  enhancedImage: string;
  operation: string;
  timestamp: number;
  fileName?: string;
}

const AppHeader = () => (
  <header className="fixed-header fixed top-0 left-0 right-0 z-50 mx-auto max-w-7xl mt-4 rounded-2xl shadow-lg">
    <div className="container mx-auto px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary-fallback rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #4D3DF4 0%, #AB3FFB 50%, #1E90FF 100%)'}}>
            <Sparkles size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[rgb(var(--foreground))]">PicShine AI</h1>
            <p className="text-xs text-[rgb(var(--muted-foreground))]">Photo Enhancement</p>
          </div>
        </div>
        <Button className="gradient-button text-sm px-4 py-2">
          <Crown size={16} className="mr-2" /> Premium
        </Button>
      </div>
    </div>
  </header>
);

const AppFooter = () => (
 <footer className="glass-card mx-auto max-w-7xl mb-4 rounded-2xl">
    <div className="container mx-auto px-6 py-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
        <div>
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-8 h-8 bg-primary-fallback rounded-md flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #4D3DF4 0%, #AB3FFB 50%, #1E90FF 100%)'}}>
              <Sparkles size={18} className="text-white" />
            </div>
            <span className="text-lg font-bold text-[rgb(var(--foreground))]">PicShine AI</span>
          </div>
          <p className="text-[rgb(var(--muted-foreground))] text-sm">Transform your photos with cutting-edge AI technology.</p>
        </div>
        <div>
          <h4 className="font-semibold mb-3 text-[rgb(var(--foreground))]">Product</h4>
          <ul className="space-y-2 text-sm text-[rgb(var(--muted-foreground))]">
            <li><a href="#features" className="hover:text-[rgb(var(--foreground))] transition-colors">Features</a></li>
            <li><a href="#pricing" className="hover:text-[rgb(var(--foreground))] transition-colors">Pricing</a></li>
            <li><a href="#" className="hover:text-[rgb(var(--foreground))] transition-colors">API</a></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-3 text-[rgb(var(--foreground))]">Support</h4>
          <ul className="space-y-2 text-sm text-[rgb(var(--muted-foreground))]">
            <li><a href="#" className="hover:text-[rgb(var(--foreground))] transition-colors">Help Center</a></li>
            <li><a href="mailto:support@picshine.ai" className="hover:text-[rgb(var(--foreground))] transition-colors">Contact</a></li>
            <li><a href="#" className="hover:text-[rgb(var(--foreground))] transition-colors">Status</a></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-3 text-[rgb(var(--foreground))]">Connect</h4>
           <p className="text-[rgb(var(--muted-foreground))] text-sm">Social links (TBD)</p>
        </div>
      </div>
      <div className="border-t border-[rgba(var(--card-border-rgb),0.2)] mt-8 pt-6 text-center text-sm text-[rgb(var(--muted-foreground))]">
        <p>&copy; {new Date().getFullYear()} PicShine AI. All rights reserved. Powered by Genkit & Google AI.</p>
        <p>For inquiries, contact: support@picshine.ai</p>
      </div>
    </div>
  </footer>
);


export default function PicShineAiPage() {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [enhancedImage, setEnhancedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [fileName, setFileName] = useState<string | null>(null);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [usageCount, setUsageCount] = useState(0);
  const [showLimitPopup, setShowLimitPopup] = useState(false);
  const [userHistory, setUserHistory] = useState<HistoryItem[]>([]);
  const hasMounted = useRef(false);

  const updateLocalStorageHistory = useCallback((newHistory: HistoryItem[]) => {
    try {
      // Attempt to save the potentially full new history (up to HISTORY_LIMIT items)
      localStorage.setItem('picShineAiHistory', JSON.stringify(newHistory));
    } catch (error) {
      // This block executes if the above setItem fails (e.g., quota exceeded)
      // No console.error here, rely on toast for user feedback if fallback also fails.
      toast({
        title: "History Save Warning",
        description: "Could not save your full enhancement history due to browser storage limits. Attempting to save only the most recent item.",
        variant: "default", // Changed from "destructive" to "default" for less alarm
      });
      try {
        if (newHistory.length > 0) {
          // Fallback: Try to save only the MOST RECENT history item
          localStorage.setItem('picShineAiHistory', JSON.stringify([newHistory[0]]));
           toast({ // Optional: Inform user that only latest was saved if preferred
             title: "Partial History Saved",
             description: "Only your most recent enhancement could be saved due to storage limits.",
             variant: "default",
           });
        } else {
          // If newHistory is empty (e.g., user cleared history), still try to update localStorage
          localStorage.setItem('picShineAiHistory', JSON.stringify([]));
        }
      } catch (fallbackError) {
        // This block executes if even saving the single latest item fails
        console.error("Critical: Error saving even the latest history item to localStorage:", fallbackError);
        toast({
          title: "History Save Failed",
          description: "Unable to save any enhancement history due to critical browser storage limits. Your session history won't be preserved.",
          variant: "destructive",
        });
      }
    }
  }, [toast]);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const storedUsage = localStorage.getItem('picShineAiUsage');
    if (storedUsage) {
      try {
        const { date, count } = JSON.parse(storedUsage);
        if (date === today && typeof count === 'number') {
          setUsageCount(count);
        } else {
          localStorage.setItem('picShineAiUsage', JSON.stringify({ date: today, count: 0 }));
          setUsageCount(0);
        }
      } catch (e) {
        // If parsing fails, reset usage
        localStorage.setItem('picShineAiUsage', JSON.stringify({ date: today, count: 0 }));
        setUsageCount(0);
      }
    } else {
      localStorage.setItem('picShineAiUsage', JSON.stringify({ date: today, count: 0 }));
    }

    const storedHistory = localStorage.getItem('picShineAiHistory');
    if (storedHistory) {
      try {
        const parsedHistory = JSON.parse(storedHistory);
         if (Array.isArray(parsedHistory)) {
          // Ensure all items in parsedHistory are valid HistoryItem objects
          const validHistory = parsedHistory.filter(item => 
            typeof item === 'object' && item !== null &&
            item.id && typeof item.id === 'string' &&
            item.enhancedImage && typeof item.enhancedImage === 'string' &&
            item.operation && typeof item.operation === 'string' &&
            item.timestamp && typeof item.timestamp === 'number'
            // item.fileName can be undefined or string
          );
          setUserHistory(validHistory);
        } else {
          console.warn("Stored history is not an array or is null, clearing.");
          setUserHistory([]);
          localStorage.removeItem('picShineAiHistory'); // Clear corrupted item
        }
      } catch (error) {
        console.error("Error parsing history from localStorage, clearing:", error);
        setUserHistory([]);
        localStorage.removeItem('picShineAiHistory'); // Clear corrupted item
      }
    }
    // Ensure hasMounted is set to true *after* initial loading effects are done.
    // requestAnimationFrame defers this slightly to avoid issues with immediate re-renders.
    requestAnimationFrame(() => {
        hasMounted.current = true;
    });
  }, []);

  useEffect(() => {
    // Only run this effect if the component has mounted and userHistory has actually changed
    // This prevents saving the initially loaded history back to localStorage redundantly.
    if (!hasMounted.current) {
      return;
    }
    updateLocalStorageHistory(userHistory);
  }, [userHistory, updateLocalStorageHistory]);


  const addHistoryItem = (enhanced: string, operation: string, currentFileName: string | null) => {
    const newItem: HistoryItem = {
      id: Date.now().toString(),
      enhancedImage: enhanced,
      operation,
      timestamp: Date.now(),
      fileName: currentFileName || undefined,
    };
    // This state update will trigger the useEffect above to save to localStorage
    setUserHistory(prevHistory => [newItem, ...prevHistory].slice(0, HISTORY_LIMIT));
  };

  const checkAndIncrementUsage = (): boolean => {
    if (usageCount >= DAILY_LIMIT) {
      setShowLimitPopup(true);
      return false;
    }
    const newCount = usageCount + 1;
    setUsageCount(newCount);
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem('picShineAiUsage', JSON.stringify({ date: today, count: newCount }));

    if (DAILY_LIMIT - newCount <= WARNING_THRESHOLD && DAILY_LIMIT - newCount > 0) {
      toast({
        title: "Usage Warning",
        description: `You have ${DAILY_LIMIT - newCount} enhancements left for today.`,
        variant: "default",
        icon: <AlertTriangle className="h-5 w-5 text-yellow-400" />,
      });
    } else if (DAILY_LIMIT - newCount === 0) {
        toast({
            title: "Usage Limit Reached",
            description: `You have used all your enhancements for today.`,
            variant: "destructive",
            icon: <AlertCircle className="h-5 w-5" />,
        });
    }
    return true;
  };

  const handleImageUpload = (file: File | null) => {
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid File Type",
          description: "Please upload a valid image file (e.g., PNG, JPG, GIF, WEBP).",
          variant: "destructive",
          icon: <AlertCircle className="h-5 w-5" />,
        });
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
        return;
      }

      setFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setOriginalImage(reader.result as string);
        setEnhancedImage(null);
      };
      reader.onerror = () => {
        toast({
          title: "File Read Error",
          description: "Could not read the selected file.",
          variant: "destructive",
          icon: <AlertCircle className="h-5 w-5" />,
        });
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
    const file = event.dataTransfer.files?.[0];
    if (file) {
      handleImageUpload(file);
       if (fileInputRef.current) {
        fileInputRef.current.files = event.dataTransfer.files;
      }
    }
  };

  const performEnhancement = async (
    enhancementFn: (input: { photoDataUri: string }) => Promise<{ enhancedPhotoDataUri: string }>,
    operationName: string,
    loadingText: string
  ) => {
    if (!originalImage) {
      toast({ title: "No Image", description: "Please upload an image first.", variant: "destructive", icon: <Info className="h-5 w-5" /> });
      return;
    }
    if (!checkAndIncrementUsage()) return;

    setIsLoading(true);
    setLoadingMessage(loadingText);
    try {
      const result = await enhancementFn({ photoDataUri: originalImage });
      setEnhancedImage(result.enhancedPhotoDataUri);
      addHistoryItem(result.enhancedPhotoDataUri, operationName, fileName);
      toast({
        title: `Image ${operationName}!`,
        description: `Your image has been successfully ${operationName.toLowerCase()}.`,
        icon: <CheckCircle2 className="h-5 w-5 text-green-400" />,
      });
    } catch (error) {
      console.error(`Error ${operationName.toLowerCase()} image:`, error);
      let errorMessage = `Could not ${operationName.toLowerCase()} the image. Please try again.`;
      if (error instanceof Error && error.message.includes("AI model did not return an image")) {
        errorMessage = error.message;
      } else if (error instanceof Error && error.message.includes("blocked")) {
        errorMessage = `Enhancement failed: ${operationName} was blocked due to content safety policies. Please try a different image.`;
      } else if (error instanceof Error) {
        errorMessage = `Error: ${error.message}`;
      }
      toast({ title: `${operationName} Failed`, description: errorMessage, variant: "destructive", icon: <AlertCircle className="h-5 w-5" /> });
       setEnhancedImage(null);
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  const handleSmartEnhance = () => {
    performEnhancement(smartEnhanceImage, "Smart Enhanced", "Applying smart enhancements & upscaling...");
  };

  const handleColorize = () => {
    performEnhancement(colorizeImage, "Colorized", "Colorizing your image...");
  };

  const handleRemoveScratches = () => {
    performEnhancement(removeScratches, "Scratches Removed", "Removing scratches from your image...");
  };

  const handleReset = () => {
    setOriginalImage(null);
    setEnhancedImage(null);
    setFileName(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDownload = () => {
    if (!enhancedImage) {
      toast({ title: "No Enhanced Image", description: "Enhance an image first to download.", variant: "destructive", icon: <Info className="h-5 w-5" /> });
      return;
    }
    const link = document.createElement('a');
    link.href = enhancedImage;

    let downloadFileName = 'picshine-ai-enhanced.png';
    if (fileName) {
        const nameWithoutExtension = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;
        downloadFileName = `picshine-ai-${nameWithoutExtension}-enhanced.png`;
    }
    link.download = downloadFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Download Started", description: "Your enhanced image is downloading.", icon: <Download className="h-5 w-5" /> });
  };

  const handleUpgradePro = () => {
    setShowLimitPopup(true); 
  };

  const loadFromHistory = (item: HistoryItem) => {
    setOriginalImage(item.enhancedImage); 
    setEnhancedImage(item.enhancedImage); 
    setFileName(item.fileName || `history_image_${item.id}.png`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast({
        title: "Loaded from History",
        description: `${item.operation} on ${item.fileName || 'image'} loaded. You can apply further enhancements.`,
        icon: <HistoryIcon className="h-5 w-5" />
    })
  };

  const ImageDisplay = ({ src, alt, placeholderText, 'data-ai-hint': aiHint }: { src: string | null, alt: string, placeholderText: string, 'data-ai-hint'?: string }) => (
    <div className="aspect-video bg-[rgba(var(--card-bg-rgb),0.3)] rounded-lg flex items-center justify-center overflow-hidden border border-[rgba(var(--card-border-rgb),0.15)] shadow-lg transition-all duration-300 hover:shadow-xl p-1">
      {src ? (
        <img src={src} alt={alt} className="max-h-full max-w-full object-contain rounded-md" data-ai-hint={aiHint} />
      ) : (
        <div className="flex flex-col items-center text-[rgb(var(--muted-foreground))] p-4 text-center">
          <ImageIcon size={48} className="mb-2 opacity-50" />
          <p>{placeholderText}</p>
        </div>
      )}
    </div>
  );


  return (
    <div className="min-h-screen flex flex-col bg-background text-[rgb(var(--foreground))]">
      <AppHeader />

      <main className="container mx-auto px-4 py-8 max-w-6xl flex-grow">
        <section id="home" className="text-center my-12 md:my-16">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6">
            <span className="bg-clip-text text-transparent" style={{backgroundImage: 'linear-gradient(45deg, rgb(var(--primary-start-rgb)), rgb(var(--primary-mid-rgb)), rgb(var(--primary-end-rgb)))'}}>
              Enhance Your Photos with AI
            </span>
          </h2>
          <p className="text-lg md:text-xl text-[rgb(var(--muted-foreground))] mb-8 max-w-3xl mx-auto">
            Transform your images with cutting-edge AI technology. Super-resolution, face enhancement, colorization, and more, effortlessly.
          </p>
        </section>

        <div id="container-242b734757198216a6ef5b94eae86475" className="ad-placeholder-container my-8">
           {/* This div is targeted by the ad script */}
        </div>

        <section className="glass-card p-6 md:p-8 rounded-2xl mb-12">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            <div className="lg:col-span-3 space-y-6">
              <label
                htmlFor="imageUpload"
                className={`flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-xl cursor-pointer transition-colors duration-200 
                            ${isDragging ? 'border-[rgb(var(--primary-start-rgb))] ring-2 ring-[rgb(var(--primary-start-rgb))] bg-[rgba(var(--primary-start-rgb),0.1)]' : 'border-[rgba(var(--card-border-rgb),0.2)] hover:border-[rgba(var(--primary-start-rgb),0.5)]'} 
                            bg-[rgba(var(--card-bg-rgb),0.2)]`}
                aria-busy={isLoading}
                aria-disabled={isLoading}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
                  <UploadCloud className={`w-12 h-12 mb-4 ${isDragging ? 'text-[rgb(var(--primary-start-rgb))]' : 'text-[rgb(var(--muted-foreground))]'}`} />
                  <p className="mb-2 text-sm text-[rgb(var(--muted-foreground))]">
                    <span className="font-semibold text-[rgb(var(--foreground))]">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-[rgb(var(--muted-foreground))]">PNG, JPG, GIF, WEBP (Max 5MB)</p>
                  {fileName && !isLoading && <p className="text-xs text-[rgb(var(--primary-start-rgb))] mt-2 bg-[rgba(var(--primary-start-rgb),0.1)] px-2 py-1 rounded-md">{fileName}</p>}
                  {isLoading && <p className="text-xs text-[rgb(var(--primary-start-rgb))] mt-2">Processing: {fileName}</p>}
                </div>
                <Input id="imageUpload" type="file" className="hidden" accept="image/*" onChange={handleFileInputChange} ref={fileInputRef} disabled={isLoading} />
              </label>

              {isLoading && (
                <div className="flex flex-col items-center justify-center space-y-3 p-4">
                  <Loader2 className="h-12 w-12 animate-spin text-[rgb(var(--primary-start-rgb))]" />
                  <p className="text-sm text-center text-[rgb(var(--muted-foreground))]">{loadingMessage}</p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Button
                  onClick={handleSmartEnhance}
                  disabled={!originalImage || isLoading || usageCount >= DAILY_LIMIT}
                  className="gradient-button w-full py-3 text-base"
                  aria-label="Smart enhance and upscale uploaded image"
                >
                  {isLoading && loadingMessage.includes("smart enhancements") ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Sparkles className="mr-2 h-5 w-5" />}
                  Smart Enhance
                </Button>
                <Button
                  onClick={handleColorize}
                  disabled={!originalImage || isLoading || usageCount >= DAILY_LIMIT}
                  className="gradient-button w-full py-3 text-base"
                  aria-label="Colorize uploaded image"
                >
                  {isLoading && loadingMessage.includes("Colorizing") ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Palette className="mr-2 h-5 w-5" />}
                  Auto Colorize
                </Button>
                 <Button
                  onClick={handleRemoveScratches}
                  disabled={!originalImage || isLoading || usageCount >= DAILY_LIMIT}
                  className="gradient-button w-full py-3 text-base sm:col-span-2"
                  aria-label="Remove scratches from uploaded image"
                >
                  {isLoading && loadingMessage.includes("Removing scratches") ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Brush className="mr-2 h-5 w-5" />}
                  Remove Scratches
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Button
                  onClick={handleDownload}
                  disabled={!enhancedImage || isLoading}
                  className="bg-[rgba(var(--primary-end-rgb),0.8)] hover:bg-[rgb(var(--primary-end-rgb))] text-white w-full py-3 text-base rounded-lg shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105"
                  aria-label="Download enhanced image"
                >
                  <Download className="mr-2 h-5 w-5" /> Download
                </Button>
                 <Button
                    onClick={handleReset}
                    variant="outline"
                    disabled={isLoading || (!originalImage && !enhancedImage)}
                    className="w-full text-base py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105 
                               border-[rgb(var(--muted-foreground))] text-[rgb(var(--muted-foreground))] hover:bg-[rgba(var(--accent),0.2)] hover:text-[rgb(var(--foreground))]"
                    aria-label="Reset images and selection"
                  >
                    <RotateCcw className="mr-2 h-5 w-5" /> Reset
                  </Button>
              </div>
              <p className="text-xs text-center text-[rgb(var(--muted-foreground))] pt-2">Daily enhancements remaining: {Math.max(0, DAILY_LIMIT - usageCount)}/{DAILY_LIMIT}.</p>
            </div>

            <div className="lg:col-span-2 space-y-4">
               <div className="ad-placeholder-container">
                  <div className="ad-label">Advertisement Area 1</div>
                   <p className="text-sm text-[rgb(var(--muted-foreground))]">AdMob Unit ID: ca-app-pub-2900494836662252/1153507362 (Visual Reference)</p>
                   <p className="text-xs text-[rgb(var(--muted-foreground))] mt-1">(e.g., AdSense or other display ad)</p>
              </div>
                <Button
                  onClick={handleUpgradePro}
                  className="w-full text-base py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105"
                  style={{background: 'linear-gradient(45deg, #FDB813, #F5821F, #E1306C)', color: 'white'}}
                  aria-label="Upgrade to Pro"
                >
                  <Crown className="mr-2 h-5 w-5" /> Upgrade to Pro
                </Button>
                 <div className="ad-placeholder-container">
                    <div className="ad-label">Advertisement Area 2</div>
                    <p className="text-sm text-[rgb(var(--muted-foreground))]">General Ad Placeholder</p>
                </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 items-start mt-10">
            <div className="space-y-3">
              <h3 className="text-xl font-semibold text-center text-[rgb(var(--foreground))]">Original Image</h3>
              <ImageDisplay src={originalImage} alt="Original" placeholderText="Upload an image to see it here." data-ai-hint="uploaded old photo" />
            </div>
            <div className="space-y-3">
              <h3 className="text-xl font-semibold text-center text-[rgb(var(--foreground))]">Enhanced Image</h3>
              <ImageDisplay src={enhancedImage} alt="Enhanced" placeholderText="Your AI-enhanced image will appear here." data-ai-hint="restored photo" />
            </div>
          </div>

          {userHistory.length > 0 && (
            <div className="mt-12 pt-8 border-t border-[rgba(var(--card-border-rgb),0.15)]">
              <h3 className="text-2xl font-semibold text-center text-[rgb(var(--foreground))] mb-6 flex items-center justify-center">
                <HistoryIcon className="mr-3 h-7 w-7 text-[rgb(var(--primary-start-rgb))]" /> Your Recent Enhancements
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {userHistory.map((item) => (
                  <Card
                    key={item.id}
                    className="glass-card overflow-hidden cursor-pointer hover:shadow-xl transition-shadow duration-200 group !rounded-lg border-transparent hover:border-[rgb(var(--primary-start-rgb))]"
                    onClick={() => loadFromHistory(item)}
                    title={`Click to load: ${item.operation} on ${item.fileName || 'image'}`}
                  >
                    <div className="aspect-square bg-[rgba(var(--card-bg-rgb),0.2)] flex items-center justify-center relative p-1">
                      <img src={item.enhancedImage} alt={`Enhanced ${item.operation}`} className="max-h-full max-w-full object-contain rounded-md" />
                      <div className="absolute inset-0 bg-[rgba(0,0,0,0.7)] opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center text-white p-2 text-center">
                        <p className="text-xs font-semibold">{item.operation}</p>
                        {item.fileName && <p className="text-[10px] truncate w-full">{item.fileName}</p>}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </section>

        <section id="features" className="my-16 md:my-24">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-[rgb(var(--foreground))]">
                Powerful AI Features
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[
                    { icon: <Zap size={32} className="text-[rgb(var(--primary-start-rgb))]"/>, title: "Super Resolution", description: "Upscale images up to 4x while preserving quality and adding fine details." },
                    { icon: <Sparkles size={32} className="text-[rgb(var(--primary-mid-rgb))]"/>, title: "Face Enhancement", description: "Intelligently enhance facial features and skin texture with AI precision." },
                    { icon: <Palette size={32} className="text-[rgb(var(--primary-end-rgb))]"/>, title: "Auto Colorization", description: "Bring black and white photos to life with realistic color restoration." },
                    { icon: <Brush size={32} className="text-green-400"/>, title: "Scratch Removal", description: "Meticulously remove scratches, dust, and damages from old photos." },
                    { icon: <Layers size={32} className="text-yellow-400"/>, title: "Batch Processing", description: "Process multiple images simultaneously with consistent quality results (Pro)." },
                    { icon: <ShieldCheck size={32} className="text-teal-400"/>, title: "Safe & Secure", description: "Your images are processed securely and deleted after enhancement." },
                ].map(feature => (
                    <div key={feature.title} className="glass-card p-6 rounded-xl text-center flex flex-col items-center">
                        <div className="p-3 rounded-full bg-[rgba(var(--primary-start-rgb),0.1)] mb-4 inline-block">
                           {feature.icon}
                        </div>
                        <h3 className="text-xl font-semibold mb-3 text-[rgb(var(--foreground))]">{feature.title}</h3>
                        <p className="text-[rgb(var(--muted-foreground))] text-sm flex-grow">{feature.description}</p>
                    </div>
                ))}
            </div>
        </section>

      </main>

      <AppFooter />

      <AlertDialog open={showLimitPopup} onOpenChange={setShowLimitPopup}>
        <AlertDialogContent className="glass-card !rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center text-[rgb(var(--foreground))]">
              <AlertTriangle className="mr-2 h-6 w-6 text-yellow-400" />
              Daily Limit Reached / Pro Feature
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[rgb(var(--muted-foreground))]">
              You have reached your daily limit of {DAILY_LIMIT} free photo enhancements, or this is a Pro feature. Please come back tomorrow or consider upgrading to Pro for unlimited access and all features.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel
              onClick={() => setShowLimitPopup(false)}
              className="bg-transparent border-[rgb(var(--muted-foreground))] text-[rgb(var(--muted-foreground))] hover:bg-[rgba(var(--muted-foreground),0.1)]"
            >
              Got it
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUpgradePro}
              className="gradient-button"
            >
                <Crown className="mr-2 h-4 w-4" /> Upgrade to Pro
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
