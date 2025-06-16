
"use client";

import React, { useState, ChangeEvent, useRef, useEffect, DragEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { UploadCloud, Sparkles, RotateCcw, Loader2, Image as ImageIcon, Download, Palette, Star, AlertTriangle, Brush, History as HistoryIcon } from 'lucide-react';
import { smartEnhanceImage } from '@/ai/flows/smart-enhance-image';
import { colorizeImage } from '@/ai/flows/colorize-image';
import { removeScratches } from '@/ai/flows/remove-scratches';

const DAILY_LIMIT = 30;
const HISTORY_LIMIT = 5;
const WARNING_THRESHOLD = 5; // Show warning when 5 enhancements are left

interface HistoryItem {
  id: string;
  // originalImage: string; // Removed to save localStorage space
  enhancedImage: string;
  operation: string;
  timestamp: number;
  fileName?: string;
}

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

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const storedUsage = localStorage.getItem('picShineAiUsage');
    if (storedUsage) {
      const { date, count } = JSON.parse(storedUsage);
      if (date === today) {
        setUsageCount(count);
      } else {
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
            setUserHistory(parsedHistory);
        } else {
            setUserHistory([]);
            localStorage.removeItem('picShineAiHistory'); // Clear invalid history
        }
      } catch (error) {
        console.error("Failed to parse history from localStorage", error);
        setUserHistory([]);
        localStorage.removeItem('picShineAiHistory'); // Clear corrupted history
      }
    }
  }, []);

  const updateLocalStorageHistory = (newHistory: HistoryItem[]) => {
    try {
      // Attempt to save the potentially full new history (up to HISTORY_LIMIT items)
      localStorage.setItem('picShineAiHistory', JSON.stringify(newHistory));
    } catch (error) {
      // This block executes if the above setItem fails (e.g., quota exceeded)
      console.error("Error saving full history to localStorage (quota likely exceeded):", error);
      toast({
        title: "History Save Warning",
        description: "Could not save your full enhancement history due to browser storage limits. Attempting to save only the most recent item.",
        variant: "default", 
      });

      // Fallback: Try to save only the most recent item from the newHistory array
      try {
        if (newHistory.length > 0) {
          // Ensure we are trying to save an array containing only the first (latest) item
          localStorage.setItem('picShineAiHistory', JSON.stringify([newHistory[0]]));
        } else {
          // If newHistory was somehow empty (defensive coding, should not happen with current addHistoryItem logic)
          localStorage.setItem('picShineAiHistory', JSON.stringify([]));
        }
      } catch (fallbackError) {
        // This block executes if even saving a single item fails
        console.error("Error saving even the latest history item to localStorage:", fallbackError);
        toast({
          title: "History Save Failed",
          description: "Unable to save any enhancement history due to critical browser storage limits. Your current session's history is in memory but won't persist across sessions.",
          variant: "destructive",
        });
        // At this point, localStorage is likely full or unusable for this key.
        // The userHistory state in React still holds the history for the current session.
      }
    }
  };

  const addHistoryItem = (original: string, enhanced: string, operation: string, currentFileName: string | null) => {
    if (!originalImage) return; // Do not add to history if original image is not set (using originalImage state for check)

    const newItem: HistoryItem = {
      id: Date.now().toString(),
      // originalImage field removed
      enhancedImage: enhanced,
      operation,
      timestamp: Date.now(),
      fileName: currentFileName || undefined,
    };
    setUserHistory(prevHistory => {
      const updatedHistory = [newItem, ...prevHistory].slice(0, HISTORY_LIMIT);
      updateLocalStorageHistory(updatedHistory);
      return updatedHistory;
    });
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
      });
    } else if (DAILY_LIMIT - newCount === 0) {
        toast({
            title: "Usage Limit Reached",
            description: `You have used all your enhancements for today.`,
            variant: "destructive",
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
      toast({ title: "No Image", description: "Please upload an image first.", variant: "destructive" });
      return;
    }
    if (!checkAndIncrementUsage()) return;

    setIsLoading(true);
    setLoadingMessage(loadingText);
    try {
      const result = await enhancementFn({ photoDataUri: originalImage });
      setEnhancedImage(result.enhancedPhotoDataUri);
      addHistoryItem(originalImage, result.enhancedPhotoDataUri, operationName, fileName);
      toast({
        title: `Image ${operationName}!`,
        description: `Your image has been successfully ${operationName.toLowerCase()}.`,
      });
    } catch (error) {
      console.error(`Error ${operationName.toLowerCase()} image:`, error);
      let errorMessage = `Could not ${operationName.toLowerCase()} the image. Please try again.`;
      if (error instanceof Error && error.message.includes("AI model did not return an image")) {
        errorMessage = error.message; // Use the more specific error from the flow
      } else if (error instanceof Error && error.message.includes("blocked")) {
        errorMessage = `Enhancement failed: ${operationName} was blocked due to content safety policies. Please try a different image.`;
      } else if (error instanceof Error) {
        errorMessage = `Error: ${error.message}`;
      }
      toast({ title: `${operationName} Failed`, description: errorMessage, variant: "destructive" });
       setEnhancedImage(null); // Clear enhanced image on failure
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
      toast({ title: "No Enhanced Image", description: "Enhance an image first to download.", variant: "destructive" });
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
    toast({ title: "Download Started", description: "Your enhanced image is downloading." });
  };

  const handleUpgradePro = () => {
    toast({
      title: "Upgrade to Pro!",
      description: "Premium features like unlimited usage, no watermarks, and high-quality export are coming soon!",
    });
  };

  const loadFromHistory = (item: HistoryItem) => {
    // When loading from history, the enhanced image becomes the new "original" 
    // for further operations, and also populates the "enhanced" view.
    setOriginalImage(item.enhancedImage); 
    setEnhancedImage(item.enhancedImage);
    setFileName(item.fileName || `history_image_${item.id}.png`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast({
        title: "Loaded from History",
        description: `${item.operation} on ${item.fileName || 'image'} loaded. You can apply further enhancements.`
    })
  };

  const ImageDisplay = ({ src, alt, placeholderText, 'data-ai-hint': aiHint }: { src: string | null, alt: string, placeholderText: string, 'data-ai-hint'?: string }) => (
    <div className="aspect-video bg-muted/50 rounded-lg flex items-center justify-center overflow-hidden border border-border shadow-sm transition-all duration-300 hover:shadow-md">
      {src ? (
        <img src={src} alt={alt} className="max-h-full max-w-full object-contain p-1" data-ai-hint={aiHint} />
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
      <Card className="w-full max-w-5xl shadow-2xl rounded-xl overflow-hidden bg-card mt-8 mb-8">
        <CardHeader className="text-center bg-gradient-to-r from-primary via-accent to-primary text-primary-foreground p-6 sm:p-8">
          <div className="flex items-center justify-center mb-2">
            <Sparkles size={36} className="mr-3" /> 
            <CardTitle className="text-2xl sm:text-3xl font-headline">PicShine AI</CardTitle>
          </div>
          <CardDescription className="text-primary-foreground/90 text-sm sm:text-base">
            Make your photos shine! Enhance, restore, and colorize with the power of AI.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 md:p-10 space-y-8">
          
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <div className="md:col-span-3 space-y-4">
              <label
                htmlFor="imageUpload"
                className={`flex flex-col items-center justify-center w-full h-48 sm:h-64 border-2 border-dashed rounded-lg cursor-pointer bg-card hover:bg-accent/10 transition-colors duration-200 ${isDragging ? 'border-primary ring-2 ring-primary' : 'border-accent'}`}
                aria-busy={isLoading}
                aria-disabled={isLoading}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <UploadCloud className="w-10 h-10 sm:w-12 sm:h-12 mb-3 text-muted-foreground" />
                  <p className="mb-2 text-sm text-muted-foreground">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground">PNG, JPG, GIF, WEBP (Max 5MB)</p>
                  {fileName && !isLoading && <p className="text-xs text-primary-foreground/80 mt-2 bg-accent/50 px-2 py-1 rounded">Selected: {fileName}</p>}
                  {isLoading && <p className="text-xs text-primary-foreground/80 mt-2">Processing: {fileName}</p>}
                </div>
                <Input id="imageUpload" type="file" className="hidden" accept="image/*" onChange={handleFileInputChange} ref={fileInputRef} disabled={isLoading} />
              </label>

              {isLoading && (
                <div className="flex flex-col items-center justify-center space-y-3 p-4">
                  <Loader2 className="h-10 w-10 sm:h-12 sm:h-12 animate-spin text-primary" />
                  <p className="text-sm text-center text-muted-foreground">{loadingMessage}</p>
                </div>
              )}
            
              <div className="grid grid-cols-2 sm:grid-cols-2 gap-3 pt-4">
                <Button
                  onClick={handleSmartEnhance}
                  disabled={!originalImage || isLoading || usageCount >= DAILY_LIMIT}
                  className="w-full text-sm sm:text-base px-3 py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105 bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90"
                  aria-label="Smart enhance and upscale uploaded image"
                >
                  {isLoading && loadingMessage.includes("smart enhancements") ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Star className="mr-2 h-5 w-5" />}
                  Smart Enhance
                </Button>
                <Button
                  onClick={handleColorize}
                  disabled={!originalImage || isLoading || usageCount >= DAILY_LIMIT}
                  className="w-full text-sm sm:text-base px-3 py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105 bg-gradient-to-r from-teal-500 to-blue-500 text-white hover:opacity-90"
                  aria-label="Colorize uploaded image"
                >
                  {isLoading && loadingMessage.includes("Colorizing") ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Palette className="mr-2 h-5 w-5" />}
                  Auto Colorize
                </Button>
                 <Button
                  onClick={handleRemoveScratches}
                  disabled={!originalImage || isLoading || usageCount >= DAILY_LIMIT}
                  className="w-full text-sm sm:text-base px-3 py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105 bg-gradient-to-r from-orange-500 to-yellow-500 text-white hover:opacity-90"
                  aria-label="Remove scratches from uploaded image"
                >
                  {isLoading && loadingMessage.includes("Removing scratches") ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Brush className="mr-2 h-5 w-5" />}
                  Remove Scratches
                </Button>
                <Button
                  onClick={handleDownload}
                  disabled={!enhancedImage || isLoading}
                  className="w-full text-sm sm:text-base px-3 py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105 bg-green-500 text-white hover:bg-green-600"
                  aria-label="Download enhanced image"
                >
                  <Download className="mr-2 h-5 w-5" /> Download
                </Button>
              </div>
               <Button
                  onClick={handleReset}
                  variant="outline"
                  disabled={isLoading || (!originalImage && !enhancedImage)}
                  className="w-full text-base px-4 py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105 border-foreground/50 text-foreground hover:bg-accent/20 mt-3"
                  aria-label="Reset images and selection"
                >
                  <RotateCcw className="mr-2 h-5 w-5" /> Reset All
                </Button>
              <p className="text-xs text-center text-muted-foreground pt-2">Daily enhancements remaining: {Math.max(0, DAILY_LIMIT - usageCount)}/{DAILY_LIMIT}.</p>

            </div>
            <div className="md:col-span-2 space-y-2">
                <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg text-center text-sm text-gray-600 dark:text-gray-300 shadow">
                    <p className="font-semibold">Advertisement</p>
                    <p className="text-xs mt-1">Placeholder for AdMob Unit:</p>
                    <p className="text-xs font-mono">ca-app-pub-2900494836662252/1153507362</p>
                </div>
                <Button
                  onClick={handleUpgradePro}
                  className="w-full text-base px-6 py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105 bg-gradient-to-r from-yellow-400 via-red-500 to-pink-500 text-white"
                  aria-label="Upgrade to Pro"
                >
                  <Star className="mr-2 h-5 w-5" /> Upgrade to Pro (Coming Soon)
                </Button>
                 <div className="bg-gray-100 dark:bg-gray-800 p-3 mt-2 rounded-lg text-center text-sm text-gray-600 dark:text-gray-300 shadow">
                    <p className="font-semibold">Advertisement</p>
                    <p className="text-xs mt-1">This is a visual ad placeholder.</p>
                    <p className="text-xs mt-1">Integrate your ad network here.</p>
                </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 items-start mt-8">
            <div className="space-y-3">
              <h3 className="text-lg sm:text-xl font-headline text-center text-foreground">Original Image</h3>
              <ImageDisplay src={originalImage} alt="Original" placeholderText="Upload an image to see it here." data-ai-hint="uploaded old photo" />
            </div>
            <div className="space-y-3">
              <h3 className="text-lg sm:text-xl font-headline text-center text-foreground">Enhanced Image</h3>
              <ImageDisplay src={enhancedImage} alt="Enhanced" placeholderText="Your AI-enhanced image will appear here." data-ai-hint="restored photo" />
            </div>
          </div>

          {userHistory.length > 0 && (
            <div className="mt-12 pt-8 border-t border-border">
              <h3 className="text-xl sm:text-2xl font-headline text-center text-foreground mb-6 flex items-center justify-center">
                <HistoryIcon className="mr-3 h-6 w-6 text-primary" /> Your Recent Enhancements
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                {userHistory.map((item) => (
                  <Card 
                    key={item.id} 
                    className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow duration-200 group bg-card"
                    onClick={() => loadFromHistory(item)}
                    title={`Click to load: ${item.operation} on ${item.fileName || 'image'}`}
                  >
                    <div className="aspect-square bg-muted/30 flex items-center justify-center relative">
                      <img src={item.enhancedImage} alt={`Enhanced ${item.operation}`} className="max-h-full max-w-full object-contain" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center text-white p-2 text-center">
                        <p className="text-xs font-semibold">{item.operation}</p>
                        {item.fileName && <p className="text-[10px] truncate w-full">{item.fileName}</p>}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

        </CardContent>
      </Card>
      <footer className="text-center py-8 text-muted-foreground text-sm">
        <p>&copy; {new Date().getFullYear()} PicShine AI. All rights reserved.</p>
        <p>Powered by Genkit & Google AI. For inquiries, contact: support@picshine.ai</p>
      </footer>

      <AlertDialog open={showLimitPopup} onOpenChange={setShowLimitPopup}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center">
              <AlertTriangle className="mr-2 h-6 w-6 text-yellow-500" />
              Daily Limit Reached
            </AlertDialogTitle>
            <AlertDialogDescription>
              You have reached your daily limit of {DAILY_LIMIT} free photo enhancements. Please come back tomorrow or consider upgrading to Pro for unlimited access.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowLimitPopup(false)}>Got it</AlertDialogAction>
            <Button onClick={handleUpgradePro} className="bg-gradient-to-r from-yellow-400 via-red-500 to-pink-500 text-white">
                <Star className="mr-2 h-4 w-4" /> Upgrade to Pro
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
