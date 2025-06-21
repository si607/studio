
"use client";

import React, { useState, ChangeEvent, useRef, useEffect, DragEvent, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { UploadCloud, Sparkles, RotateCcw, Loader2, Image as ImageIcon, Download, Palette, Brush, History as HistoryIcon, Crown, AlertTriangle, AlertCircle, Info, CheckCircle2, Layers, Settings2, ShieldCheck, Zap, Camera, Share2, User, FileText, BookOpen, Maximize, Scissors, Newspaper } from 'lucide-react';
import { smartEnhanceImage } from '@/ai/flows/smart-enhance-image';
import { colorizeImage } from '@/ai/flows/colorize-image';
import { removeScratches } from '@/ai/flows/remove-scratches';
import { focusEnhanceFace } from '@/ai/flows/focus-enhance-face';
import type { FocusEnhanceFaceInput } from '@/ai/flows/focus-enhance-face';
import { sharpenImage } from '@/ai/flows/sharpen-image';
import { removeBackground } from '@/ai/flows/remove-background';


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
            <li><a href="#blog" className="hover:text-[rgb(var(--foreground))] transition-colors">Blog</a></li>
            <li><a href="#" className="hover:text-[rgb(var(--foreground))] transition-colors">API</a></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-3 text-[rgb(var(--foreground))]">Legal & Support</h4>
          <ul className="space-y-2 text-sm text-[rgb(var(--muted-foreground))]">
            <li><a href="/privacy-policy" className="hover:text-[rgb(var(--foreground))] transition-colors flex items-center"><FileText size={14} className="mr-2" /> Privacy Policy</a></li>
            <li><a href="/terms-of-service" className="hover:text-[rgb(var(--foreground))] transition-colors flex items-center"><BookOpen size={14} className="mr-2" /> Terms of Service</a></li>
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

  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [showCameraView, setShowCameraView] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isShareApiAvailable, setIsShareApiAvailable] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && navigator.share) {
      setIsShareApiAvailable(true);
    } else {
      setIsShareApiAvailable(false);
    }
  }, []);


  useEffect(() => {
    if (showCameraView && typeof window !== 'undefined' && typeof navigator !== 'undefined' && navigator.mediaDevices) {
      const getCameraPermission = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          setHasCameraPermission(true);
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } catch (error: any) {
          console.error('Error accessing camera:', error.name, error.message, error);
          setHasCameraPermission(false);
          setShowCameraView(false);

          let title = 'Camera Access Error';
          let description = 'Could not access the camera. Ensure it is not in use and permissions are granted in browser/system settings.';

          if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
            title = 'Camera Permission Denied';
            description = 'You denied camera access. Please enable camera permissions in your browser or system settings to use this feature.';
          } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
            title = 'No Camera Found';
            description = 'No camera was found on your device. Ensure a camera is connected and enabled.';
          } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError' || error.name === 'AbortError') {
            title = 'Camera In Use or Unreadable';
            description = 'The camera might be in use by another application, or there was a hardware/OS error preventing access. Try closing other apps or restarting your browser/device.';
          } else if (error.name === 'OverconstrainedError' || error.name === 'ConstraintNotSatisfiedError') {
            title = 'Camera Constraints Not Met';
            description = `The camera doesn't support the requested settings. Try a different camera if available. (Error: ${error.message})`;
          } else if (error.name === 'TypeError') {
            title = 'Camera Configuration Error';
            description = `There's an issue with the camera request configuration. (Error: ${error.message})`;
          } else if (error.message && error.message.toLowerCase().includes('secure context')) {
            title = 'Secure Connection Required';
            description = 'Camera access requires a secure connection (HTTPS). Please ensure you are accessing this page over HTTPS.';
          }
          
          toast({
            variant: 'destructive',
            title: title,
            description: description,
            icon: <AlertCircle className="h-5 w-5" />,
            duration: 10000,
          });
        }
      };
      getCameraPermission();
    } else if (!showCameraView && videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
    }
    return () => { 
      if (typeof window !== 'undefined' && videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [showCameraView, toast]);


  const updateLocalStorageHistory = useCallback((newHistory: HistoryItem[]) => {
    if (typeof window === 'undefined' || !hasMounted.current) return;
    try {
      localStorage.setItem('picShineAiHistory', JSON.stringify(newHistory));
    } catch (error) {
      console.warn("Could not save full history to localStorage, attempting to save latest only:", error);
      toast({
        title: "History Save Warning",
        description: "Could not save your full enhancement history due to browser storage limits. Attempting to save only the most recent item.",
        variant: "default",
      });
      try {
        if (newHistory.length > 0) {
          localStorage.setItem('picShineAiHistory', JSON.stringify([newHistory[0]]));
           toast({
             title: "Partial History Saved",
             description: "Only your most recent enhancement could be saved due to storage limits.",
             variant: "default",
           });
        } else {
          localStorage.setItem('picShineAiHistory', JSON.stringify([]));
        }
      } catch (fallbackError) {
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
    if (typeof window !== 'undefined') {
      if (!hasMounted.current) {
          hasMounted.current = true;
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
              console.error("Error parsing usage from localStorage, resetting:", e);
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
                const validHistory = parsedHistory.filter(item =>
                  typeof item === 'object' && item !== null &&
                  item.id && typeof item.id === 'string' &&
                  item.enhancedImage && typeof item.enhancedImage === 'string' &&
                  item.operation && typeof item.operation === 'string' &&
                  item.timestamp && typeof item.timestamp === 'number'
                );
                setUserHistory(validHistory);
              } else {
                console.warn("Stored history is not an array or is null, clearing.");
                setUserHistory([]);
                localStorage.removeItem('picShineAiHistory');
              }
            } catch (error) {
              console.error("Error parsing history from localStorage, clearing:", error);
              setUserHistory([]);
              localStorage.removeItem('picShineAiHistory');
            }
          }
      }
    }
  }, []);

  useEffect(() => {
    if (hasMounted.current) {
      updateLocalStorageHistory(userHistory);
    }
  }, [userHistory, updateLocalStorageHistory]);


  const addHistoryItem = (enhanced: string, operation: string, currentFileName: string | null) => {
    const newItem: HistoryItem = {
      id: Date.now().toString(),
      enhancedImage: enhanced,
      operation,
      timestamp: Date.now(),
      fileName: currentFileName || undefined,
    };
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
    if (typeof window !== 'undefined') {
        localStorage.setItem('picShineAiUsage', JSON.stringify({ date: today, count: newCount }));
    }

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
        setShowCameraView(false); 
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
  
  const handleCapture = () => {
    if (typeof window !== 'undefined' && videoRef.current && canvasRef.current && hasCameraPermission) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUri = canvas.toDataURL('image/png');
        setOriginalImage(dataUri);
        setEnhancedImage(null);
        setFileName(`capture-${Date.now()}.png`);
        setShowCameraView(false); 
        toast({ title: "Image Captured", description: "Image captured from camera.", icon: <CheckCircle2 className="h-5 w-5 text-green-400" /> });
      } else {
        toast({ title: "Capture Error", description: "Could not get canvas context.", variant: "destructive" });
      }
    } else {
       toast({ title: "Capture Error", description: "Camera not ready or permission denied.", variant: "destructive" });
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
    enhancementFn: (input: any) => Promise<{ enhancedPhotoDataUri: string }>,
    operationName: string,
    loadingText: string,
    additionalParams?: Record<string, any>
  ) => {
    if (!originalImage) {
      toast({ title: "No Image", description: "Please upload or capture an image first.", variant: "destructive", icon: <Info className="h-5 w-5" /> });
      return;
    }
    if (!checkAndIncrementUsage()) return;

    setIsLoading(true);
    setEnhancedImage(null);
    setLoadingMessage(loadingText);
    try {
      const inputData = { photoDataUri: originalImage, ...additionalParams };
      const result = await enhancementFn(inputData);
      setEnhancedImage(result.enhancedPhotoDataUri);
      addHistoryItem(result.enhancedPhotoDataUri, operationName, fileName);
      toast({
        title: `Image ${operationName}!`,
        description: `Your image has been successfully ${operationName.toLowerCase()}.`,
        icon: <CheckCircle2 className="h-5 w-5 text-green-400" />,
      });
    } catch (error: any) {
      console.error(`[${operationName}] Client-side error wrapper. Original error object:`, error);
      setEnhancedImage(null); 
      let errorMessage = `Could not ${operationName.toLowerCase()} the image. Please try again.`;
      let errorTitle = `${operationName} Failed`;

      if (error instanceof Error) {
        const lowerCaseErrorMessage = error.message.toLowerCase();
        const originalMsg = error.message; 

        if (originalMsg.includes("not available in your country") || originalMsg.includes("image generation is not available in your country")) {
            errorTitle = `AI Feature Unavailable`;
            errorMessage = `${operationName} failed: This AI feature is not available in your current region/country. Please check Google Cloud service availability.`;
        } else if (
          originalMsg.startsWith('CRITICAL:') || 
          lowerCaseErrorMessage.includes('an error occurred in the server components render') ||
          (lowerCaseErrorMessage.includes("google ai") && (lowerCaseErrorMessage.includes("failed") || lowerCaseErrorMessage.includes("error"))) ||
          lowerCaseErrorMessage.includes('internal server error') ||
          lowerCaseErrorMessage.includes('failed to fetch') ||
          (lowerCaseErrorMessage.includes("<html") && !lowerCaseErrorMessage.includes("</html>") && originalMsg.length < 300 && !originalMsg.toLowerCase().includes('<html><head><meta name="robots" content="noindex"/></head><body>'))
        ) {
          errorTitle = "Server-Side AI Error";
          errorMessage = originalMsg.startsWith('CRITICAL:') ? originalMsg : `CRITICAL: AI ${operationName.toLowerCase()} failed due to a server-side configuration issue. YOU MUST CHECK YOUR FIREBASE FUNCTION LOGS for the detailed error digest. This is often related to Google AI API key, billing, or permissions in your production environment.`;
        } else if (lowerCaseErrorMessage.includes('ai model did not return an image')) {
          errorTitle = "AI Model Error";
          errorMessage = `AI Error: The model didn't return an image for ${operationName.toLowerCase()}. This could be due to safety filters, an issue with the input image, or a temporary model problem. Try a different image or adjust your request. (Details in server logs if issue persists).`;
        } else if (lowerCaseErrorMessage.includes('blocked by safety setting') || lowerCaseErrorMessage.includes('safety policy violation')) {
          errorTitle = "Content Safety Block";
          errorMessage = `${operationName} was blocked due to content safety policies. Please try a different image.`;
        } else if (lowerCaseErrorMessage.includes('api key not valid') || lowerCaseErrorMessage.includes('permission denied') || lowerCaseErrorMessage.includes('authentication failed') || lowerCaseErrorMessage.includes('api_key_not_valid')) {
          errorTitle = "Server Configuration Error";
          errorMessage = `Server Configuration Error: There's an issue with the Google AI API key or permissions for ${operationName.toLowerCase()}. Please check server setup and Firebase Function logs. Ensure GOOGLE_API_KEY is correctly set as a secure environment variable in Firebase App Hosting.`;
        } else if (lowerCaseErrorMessage.includes('quota') || lowerCaseErrorMessage.includes('limit')) {
          errorTitle = "Service Limit Reached";
          errorMessage = `Service Limit Reached: The AI service for ${operationName.toLowerCase()} may be experiencing high demand or a quota limit has been reached. Please try again later. Check Firebase Function logs and Google Cloud project quotas.`;
        } else if (lowerCaseErrorMessage.includes('billing account not found') || lowerCaseErrorMessage.includes('billing') || lowerCaseErrorMessage.includes('project_not_linked_to_billing_account')) {
          errorTitle = "Billing Issue";
          errorMessage = `Billing Issue: ${operationName} failed due to a billing account problem. Please check your Google Cloud project's billing status and ensure it's active and linked correctly. Check Firebase Function logs for more details.`;
        } else if (lowerCaseErrorMessage.includes('generative language api has not been used') || lowerCaseErrorMessage.includes('api is not enabled')) {
          errorTitle = "API Not Enabled";
          errorMessage = `The Google Generative Language API required for ${operationName.toLowerCase()} is not enabled for your project or has not been used before. Please enable it in the Google Cloud Console and try again. Check Firebase Function logs for more details.`;
        } else {
          const isShortHtmlError = lowerCaseErrorMessage.includes("<html") && !lowerCaseErrorMessage.includes("</html>") && originalMsg.length < 300 && !originalMsg.toLowerCase().includes('<html><head><meta name="robots" content="noindex"/></head><body>');
          if (isShortHtmlError) {
             errorTitle = "Server-Side Application Error";
             errorMessage = `CRITICAL: An application error occurred on the server during ${operationName.toLowerCase()}. This is often a coding error in the Next.js backend or AI flow. YOU MUST CHECK YOUR FIREBASE FUNCTION LOGS for the detailed error stack trace and digest.`;
          } else {
            const detail = originalMsg.length > 200 ? `An unexpected error occurred during ${operationName.toLowerCase()}. See server logs for more details.` : originalMsg;
            errorMessage = `Error during ${operationName.toLowerCase()}: ${detail}`;
          }
        }
      }
      toast({ title: errorTitle, description: errorMessage, variant: "destructive", icon: <AlertCircle className="h-5 w-5" />, duration: 15000 });
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
  
  const handleFocusEnhanceFace = () => {
    const enhancementStyle = "natural clarity"; 
    performEnhancement(
      focusEnhanceFace as (input: FocusEnhanceFaceInput) => Promise<{ enhancedPhotoDataUri: string }>, 
      "Face Focused", 
      `Applying ${enhancementStyle} face enhancement...`, 
      { enhancementStyle }
    );
  };

  const handleSharpenImage = () => {
    performEnhancement(sharpenImage, "Sharpened", "Sharpening image details...");
  };

  const handleRemoveBackground = () => {
    performEnhancement(removeBackground, "Background Removed", "Removing background from your image...");
  };

  const handleReset = () => {
    setOriginalImage(null);
    setEnhancedImage(null);
    setFileName(null);
    setShowCameraView(false);
    setHasCameraPermission(null);
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

  const handleShare = async () => {
    if (!enhancedImage) {
      toast({ title: "No Enhanced Image", description: "Enhance an image first to share.", variant: "destructive", icon: <Info className="h-5 w-5" /> });
      return;
    }
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && !navigator.share) {
      toast({ title: "Share Not Supported", description: "Your browser does not support the Web Share API.", variant: "destructive", icon: <Info className="h-5 w-5" /> });
      return;
    }

    try {
      const response = await fetch(enhancedImage);
      const blob = await response.blob();
      const file = new File([blob], fileName || 'picshine-enhanced.png', { type: blob.type });
      
      if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && navigator.share) { 
        await navigator.share({
          title: 'Enhanced by PicShine AI',
          text: `Check out this image I enhanced with PicShine AI! Original: ${fileName || 'image'}`,
          files: [file],
        });
        toast({ title: "Shared!", description: "Image shared successfully.", icon: <CheckCircle2 className="h-5 w-5 text-green-400" /> });
      } else {
        throw new Error("Share API became unavailable unexpectedly or navigator is not defined.");
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Share action was cancelled by the user.');
        return;
      }
      console.error('Error sharing:', error);
      toast({ title: "Share Failed", description: `Could not share the image: ${error.message}`, variant: "destructive", icon: <AlertCircle className="h-5 w-5" /> });
    }
  };

  const handleUpgradePro = () => {
    setShowLimitPopup(true);
  };

  const loadFromHistory = (item: HistoryItem) => {
    setOriginalImage(item.enhancedImage); 
    setEnhancedImage(item.enhancedImage);
    setFileName(item.fileName || `history_image_${item.id}.png`);
    setShowCameraView(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast({
        title: "Loaded from History",
        description: `${item.operation} on ${item.fileName || 'image'} loaded. You can apply further enhancements.`,
        icon: <HistoryIcon className="h-5 w-5" />
    })
  };

  const ImageDisplay = ({ src, alt, placeholderText, 'data-ai-hint': aiHint, isLoading = false, loadingText = "Enhancing..." }: { src: string | null; alt: string; placeholderText: string; 'data-ai-hint'?: string, isLoading?: boolean, loadingText?: string }) => (
    <div className="relative aspect-square bg-[rgba(var(--card-bg-rgb),0.3)] rounded-lg flex items-center justify-center overflow-hidden border border-[rgba(var(--card-border-rgb),0.15)] shadow-lg transition-all duration-300 hover:shadow-xl p-1">
      {src ? (
        <img src={src} alt={alt} className="max-h-full max-w-full object-contain rounded-md" data-ai-hint={aiHint} />
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
    <div className="min-h-screen flex flex-col bg-background text-[rgb(var(--foreground))]">
      <AppHeader />
      <canvas ref={canvasRef} className="hidden"></canvas>

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

        <section className="glass-card p-6 md:p-8 rounded-2xl mb-12">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            <div className="lg:col-span-3 space-y-6">
              {!showCameraView ? (
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
                    <Button type="button" variant="outline" size="sm" className="mt-2 text-xs" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowCameraView(true); }} disabled={isLoading}>
                      <Camera size={14} className="mr-2" /> Use Camera
                    </Button>
                    <p className="text-xs text-[rgb(var(--muted-foreground))] mt-2">PNG, JPG, GIF, WEBP (Max 5MB)</p>
                    {fileName && !isLoading && !originalImage && <p className="text-xs text-[rgb(var(--primary-start-rgb))] mt-2 bg-[rgba(var(--primary-start-rgb),0.1)] px-2 py-1 rounded-md">{fileName}</p>}
                    {isLoading && <p className="text-xs text-[rgb(var(--primary-start-rgb))] mt-2">Processing: {fileName}</p>}
                  </div>
                  <Input id="imageUpload" type="file" className="hidden" accept="image/*" onChange={handleFileInputChange} ref={fileInputRef} disabled={isLoading} />
                </label>
              ) : (
                <div className="space-y-4">
                  <Card className="border-[rgba(var(--card-border-rgb),0.2)] bg-[rgba(var(--card-bg-rgb),0.2)]">
                    <CardHeader>
                      <CardTitle className="text-lg">Camera Preview</CardTitle>
                    </CardHeader>
                    <div className="p-4">
                      <video ref={videoRef} className="w-full aspect-video rounded-md bg-black" autoPlay muted playsInline />
                      {hasCameraPermission === false && (
                        <Alert variant="destructive" className="mt-2">
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle>Camera Access Denied</AlertTitle>
                          <AlertDescription>
                            Please allow camera access in your browser settings to use this feature.
                          </AlertDescription>
                        </Alert>
                      )}
                       {hasCameraPermission === null && !isLoading && ( 
                        <Alert variant="default" className="mt-2 border-yellow-400/50 text-yellow-400">
                           <AlertTriangle className="h-4 w-4" />
                          <AlertTitle>Requesting Camera</AlertTitle>
                          <AlertDescription>
                            Attempting to access your camera. Please grant permission if prompted.
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </Card>
                  <div className="flex gap-2">
                    <Button onClick={handleCapture} disabled={isLoading || (typeof window !== 'undefined' && !hasCameraPermission)} className="gradient-button w-full">
                      <Camera className="mr-2 h-5 w-5" /> Capture
                    </Button>
                    <Button variant="outline" onClick={() => setShowCameraView(false)} disabled={isLoading} className="w-full">
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
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
                  className="gradient-button w-full py-3 text-base"
                  aria-label="Remove scratches from uploaded image"
                >
                  {isLoading && loadingMessage.includes("Removing scratches") ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Brush className="mr-2 h-5 w-5" />}
                  Remove Scratches
                </Button>
                 <Button
                  onClick={handleFocusEnhanceFace}
                  disabled={!originalImage || isLoading || usageCount >= DAILY_LIMIT}
                  className="gradient-button w-full py-3 text-base"
                  aria-label="Focus enhance face in uploaded image"
                >
                  {isLoading && loadingMessage.includes("face enhancement") ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <User className="mr-2 h-5 w-5" />}
                  Face Enhance
                </Button>
                <Button
                  onClick={handleSharpenImage}
                  disabled={!originalImage || isLoading || usageCount >= DAILY_LIMIT}
                  className="gradient-button w-full py-3 text-base"
                  aria-label="Sharpen image details"
                >
                  {isLoading && loadingMessage.includes("Sharpening") ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Maximize className="mr-2 h-5 w-5" />}
                  Sharpen Image
                </Button>
                <Button
                  onClick={handleRemoveBackground}
                  disabled={!originalImage || isLoading || usageCount >= DAILY_LIMIT}
                  className="gradient-button w-full py-3 text-base"
                  aria-label="Remove background from image"
                >
                  {isLoading && loadingMessage.includes("Removing background") ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Scissors className="mr-2 h-5 w-5" />}
                  Remove BG
                </Button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
                    disabled={isLoading || (!originalImage && !enhancedImage && !showCameraView)}
                    className="w-full text-base py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105
                               border-[rgb(var(--muted-foreground))] text-[rgb(var(--muted-foreground))] hover:bg-[rgba(var(--accent),0.2)] hover:text-[rgb(var(--foreground))]"
                    aria-label="Reset images and selection"
                  >
                    <RotateCcw className="mr-2 h-5 w-5" /> Reset
                  </Button>
                  <Button
                    onClick={handleShare}
                    disabled={!enhancedImage || isLoading || !isShareApiAvailable}
                    variant="outline"
                    className="w-full text-base py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105
                              border-green-500/50 text-green-500 hover:bg-green-500/10 hover:text-green-400 md:col-span-1 disabled:border-gray-500/30 disabled:text-gray-500/50 disabled:hover:bg-transparent"
                    aria-label="Share enhanced image"
                    title={!isShareApiAvailable ? "Share not supported on your browser" : "Share enhanced image"}
                  >
                    <Share2 className="mr-2 h-5 w-5" /> Share
                  </Button>
              </div>
              <p className="text-xs text-center text-[rgb(var(--muted-foreground))] pt-2">Daily enhancements remaining: {Math.max(0, DAILY_LIMIT - usageCount)}/{DAILY_LIMIT}.</p>
            </div>

            <div className="lg:col-span-2 space-y-4">
              <Card className="glass-card p-4 !rounded-xl">
                <CardHeader className="p-2 pt-0 md:p-2 md:pt-0">
                  <CardTitle className="text-lg flex items-center">
                    <Crown size={20} className="mr-2 text-yellow-400" /> Go Pro
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-2 pb-0 md:p-2 md:pb-0 text-sm">
                  <ul className="space-y-3 text-[rgb(var(--foreground))]">
                    <li className="flex items-center">
                      <CheckCircle2 size={16} className="mr-3 text-green-400 flex-shrink-0" />
                      <span>Unlimited Photo Enhancements</span>
                    </li>
                    <li className="flex items-center">
                      <Zap size={16} className="mr-3 text-blue-400 flex-shrink-0" />
                      <span>Highest Quality & Resolution</span>
                    </li>
                    <li className="flex items-center">
                      <ShieldCheck size={16} className="mr-3 text-teal-400 flex-shrink-0" />
                      <span>No Watermarks</span>
                    </li>
                    <li className="flex items-center">
                      <Layers size={16} className="mr-3 text-purple-400 flex-shrink-0" />
                      <span>Priority Processing</span>
                    </li>

                  </ul>
                </CardContent>
              </Card>

              <Button
                onClick={handleUpgradePro}
                className="w-full text-base py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105"
                style={{background: 'linear-gradient(45deg, #FDB813, #F5821F, #E1306C)', color: 'white'}}
                aria-label="Upgrade to Pro"
              >
                <Crown className="mr-2 h-5 w-5" /> Upgrade to Pro
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 items-start mt-10">
            <div className="space-y-3">
              <h3 className="text-xl font-semibold text-center text-[rgb(var(--foreground))]">Original Image</h3>
              <ImageDisplay src={originalImage} alt="Original" placeholderText="Upload or capture an image to see it here." data-ai-hint="uploaded old photo" />
            </div>
            <div className="space-y-3">
              <h3 className="text-xl font-semibold text-center text-[rgb(var(--foreground))]">Enhanced Image</h3>
              <ImageDisplay src={enhancedImage} alt="Enhanced" placeholderText="Your AI-enhanced image will appear here." data-ai-hint="restored photo" isLoading={isLoading} loadingText={loadingMessage} />
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
                    { icon: <Sparkles size={32} className="text-[rgb(var(--primary-start-rgb))]"/>, title: "Super Resolution", description: "Upscale images up to 4x while preserving quality and adding fine details." },
                    { icon: <User size={32} className="text-[rgb(var(--primary-mid-rgb))]"/>, title: "Face Enhancement", description: "Intelligently enhance facial features and skin texture with AI precision." },
                    { icon: <Palette size={32} className="text-[rgb(var(--primary-end-rgb))]"/>, title: "Auto Colorization", description: "Bring black and white photos to life with realistic color restoration." },
                    { icon: <Brush size={32} className="text-green-400"/>, title: "Scratch Removal", description: "Meticulously remove scratches, dust, and damages from old photos." },
                    { icon: <Maximize size={32} className="text-blue-400"/>, title: "Sharpen Image", description: "Enhance image clarity and bring out fine details for a crisper look." },
                    { icon: <Scissors size={32} className="text-red-400"/>, title: "Background Removal", description: "Automatically remove the background from your photos with a single click." },
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

        <section id="blog" className="my-16 md:my-24">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-[rgb(var(--foreground))]">
                From the Blog
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[
                    { 
                        image: 'https://placehold.co/600x400.png',
                        'data-ai-hint': 'photography tips',
                        title: '5 Tips for Restoring Old Family Photos', 
                        excerpt: 'Learn how to breathe new life into your cherished memories with these simple yet effective AI-powered restoration techniques.' 
                    },
                    { 
                        image: 'https://placehold.co/600x400.png',
                        'data-ai-hint': 'colorization history',
                        title: 'The Magic of AI Colorization: From B&W to Vivid', 
                        excerpt: 'Explore the technology behind turning black and white photos into vibrant color images and how PicShine AI makes it easy.' 
                    },
                    { 
                        image: 'https://placehold.co/600x400.png',
                        'data-ai-hint': 'portrait photography',
                        title: 'Get Professional-Looking Portraits with AI', 
                        excerpt: 'You don’t need an expensive camera. Discover how to enhance facial features and create stunning portraits with just a few clicks.' 
                    },
                ].map(post => (
                    <div key={post.title} className="glass-card overflow-hidden rounded-xl flex flex-col">
                        <img src={post.image} alt={post.title} className="w-full h-48 object-cover" data-ai-hint={post['data-ai-hint']} />
                        <div className="p-6 flex flex-col flex-grow">
                            <h3 className="text-xl font-semibold mb-3 text-[rgb(var(--foreground))]">{post.title}</h3>
                            <p className="text-[rgb(var(--muted-foreground))] text-sm flex-grow">{post.excerpt}</p>
                            <a href="#" className="text-sm font-semibold text-[rgb(var(--primary-start-rgb))] hover:underline mt-4 self-start">Read More &rarr;</a>
                        </div>
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
