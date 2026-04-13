import { useState, useCallback, useRef, useEffect } from "react";
import { Layout } from "@/components/layout";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth, SignUp, SignIn } from "@clerk/react";
import { 
  useCreateBook, 
  useRequestUploadUrl, 
  useCreatePhoto, 
  useGenerateBookPages,
  useGetBook,
  useUpdateBook,
  useUpdatePage,
  useListBookPages,
  getGetBookQueryKey,
  useGenerateBookPdf,
  useCreateLuluOrder,
} from "@workspace/api-client-react";
import type { ColoringPage, LuluOrderResponse } from "@workspace/api-client-react";
import { BookStyle, CreateBookBodyStyle, BookStatus } from "@workspace/api-client-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Loader2, UploadCloud, X, Wand2, ImageIcon, Sparkles, FileDown, Book as BookIcon, Check, ShieldCheck, GripVertical, Type } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { getImageUrl } from "@/lib/image-utils";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import simpleStyleImg from "@/assets/style-simple.png";
import cartoonStyleImg from "@/assets/style-cartoon.png";
import detailedStyleImg from "@/assets/style-detailed.png";

export type CoverTemplateId = "classic" | "sunshine" | "ocean" | "garden" | "starlight" | "rainbow";

interface CoverTemplateConfig {
  id: CoverTemplateId;
  name: string;
  description: string;
  bg: string;
  border: string;
  titleColor: string;
  subtitleColor: string;
  taglineColor: string;
  accentColor: string;
}

const COVER_TEMPLATES: CoverTemplateConfig[] = [
  {
    id: "classic",
    name: "Classic",
    description: "Timeless & elegant",
    bg: "#F9F9F6",
    border: "#4A4A4A",
    titleColor: "#141414",
    subtitleColor: "#555",
    taglineColor: "#888",
    accentColor: "#333",
  },
  {
    id: "sunshine",
    name: "Sunshine",
    description: "Warm & cheerful",
    bg: "#FFF8D0",
    border: "#D4890A",
    titleColor: "#6B3200",
    subtitleColor: "#8A5008",
    taglineColor: "#A06010",
    accentColor: "#C07010",
  },
  {
    id: "ocean",
    name: "Ocean",
    description: "Cool & serene",
    bg: "#E0F4FF",
    border: "#2080CC",
    titleColor: "#053A80",
    subtitleColor: "#0D5AA0",
    taglineColor: "#1A70B8",
    accentColor: "#0D5AA0",
  },
  {
    id: "garden",
    name: "Garden",
    description: "Fresh & natural",
    bg: "#E8FBE8",
    border: "#3C9A3C",
    titleColor: "#0F4D0F",
    subtitleColor: "#1E6B1E",
    taglineColor: "#2A7A2A",
    accentColor: "#258025",
  },
  {
    id: "starlight",
    name: "Starlight",
    description: "Bold & magical",
    bg: "#13103D",
    border: "#9A8FE8",
    titleColor: "#FFFFFF",
    subtitleColor: "#D8D4FF",
    taglineColor: "#B8B2F0",
    accentColor: "#B0A8FF",
  },
  {
    id: "rainbow",
    name: "Rainbow",
    description: "Vibrant & fun",
    bg: "#FFFFFF",
    border: "#DD3333",
    titleColor: "#8B18B0",
    subtitleColor: "#3030BB",
    taglineColor: "#198050",
    accentColor: "#E07800",
  },
];

function CoverPreview({
  template,
  title,
  subtitle,
  tagline,
  small = false,
}: {
  template: CoverTemplateConfig;
  title: string;
  subtitle?: string;
  tagline?: string;
  small?: boolean;
}) {
  const starDots = template.id === "starlight"
    ? [{ x: 20, y: 15 }, { x: 75, y: 10 }, { x: 60, y: 35 }, { x: 10, y: 50 }, { x: 85, y: 55 }]
    : [];
  const rainbowStripes = template.id === "rainbow"
    ? ["#EF4444", "#F97316", "#EAB308", "#22C55E", "#3B82F6", "#8B5CF6"]
    : [];

  return (
    <div
      className="relative rounded-lg overflow-hidden flex flex-col"
      style={{
        background: template.bg,
        border: `2px solid ${template.border}`,
        width: small ? 80 : "100%",
        height: small ? 104 : "100%",
        minHeight: small ? 104 : 160,
      }}
    >
      {starDots.map((s, i) => (
        <div key={i} className="absolute rounded-full" style={{ left: `${s.x}%`, top: `${s.y}%`, width: 3, height: 3, background: template.border }} />
      ))}
      {rainbowStripes.length > 0 && (
        <div className="absolute top-0 left-0 right-0 flex" style={{ height: small ? 8 : 12 }}>
          {rainbowStripes.map((c, i) => (
            <div key={i} className="flex-1" style={{ background: c }} />
          ))}
        </div>
      )}
      <div
        className="absolute inset-1.5 rounded flex flex-col items-center justify-center text-center px-2"
        style={{ border: `1px solid ${template.border}40` }}
      >
        <div
          className="font-bold leading-tight"
          style={{
            color: template.titleColor,
            fontSize: small ? 8 : 15,
            fontFamily: "Georgia, serif",
          }}
        >
          {title || "Book Title"}
        </div>
        {subtitle && !small && (
          <div style={{ color: template.subtitleColor, fontSize: 10, marginTop: 3, fontStyle: "italic" }}>
            {subtitle}
          </div>
        )}
        <div style={{ color: template.taglineColor, fontSize: small ? 5 : 8, marginTop: small ? 3 : 8 }}>
          {tagline || "A Personalized Coloring Book"}
        </div>
        <div style={{ color: template.accentColor, fontSize: small ? 5 : 8, marginTop: small ? 2 : 6, fontWeight: "bold" }}>
          ColorGifts
        </div>
      </div>
    </div>
  );
}

function getPriceForPages(pageCount: number): string {
  if (pageCount <= 20) return "$24.95";
  if (pageCount <= 30) return "$29.95";
  if (pageCount <= 40) return "$34.95";
  return "$49.95";
}

function getPriceTierLabel(pageCount: number): string {
  if (pageCount <= 20) return "10–20 pages";
  if (pageCount <= 30) return "21–30 pages";
  if (pageCount <= 40) return "31–40 pages";
  return "40+ pages";
}

function SortablePageRow({
  page,
  index,
  onCaptionChange,
}: {
  page: ColoringPage & { caption: string };
  index: number;
  onCaptionChange: (id: number, caption: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: page.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-4 bg-card border border-border rounded-2xl p-3 shadow-sm"
    >
      <button
        className="cursor-grab active:cursor-grabbing touch-none text-muted-foreground hover:text-foreground px-1 flex-shrink-0"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-5 h-5" />
      </button>

      <div className="w-14 h-14 rounded-xl overflow-hidden bg-muted border border-border flex-shrink-0">
        {page.coloringImagePath ? (
          <img src={getImageUrl(page.coloringImagePath)} alt={`Page ${index + 1}`} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="w-5 h-5 text-muted-foreground" />
          </div>
        )}
      </div>

      <span className="text-sm font-medium text-muted-foreground w-14 flex-shrink-0">Page {index + 1}</span>

      <div className="flex-1 flex items-center gap-2 min-w-0">
        <Type className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <input
          type="text"
          value={page.caption}
          onChange={(e) => onCaptionChange(page.id, e.target.value)}
          placeholder="Add a caption (optional)…"
          className="flex-1 text-sm bg-muted/50 rounded-lg px-3 py-1.5 border border-transparent focus:border-ring focus:outline-none min-w-0"
        />
      </div>
    </div>
  );
}

const step1Schema = z.object({
  title: z.string().min(1, "Title is required").max(100),
  subtitle: z.string().max(100).optional().nullable(),
  dedication: z.string().max(500).optional().nullable(),
  style: z.enum([BookStyle.simple, BookStyle.cartoon, BookStyle.detailed])
});

type Step1Values = z.infer<typeof step1Schema>;

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function CreateBook() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { isSignedIn, isLoaded } = useAuth();
  
  const [step, setStep] = useState(1);
  const [bookId, setBookId] = useState<number | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [uploadSource, setUploadSource] = useState<"device" | "facebook" | "dropbox" | "googledrive">("device");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authView, setAuthView] = useState<"sign-up" | "sign-in">("sign-up");
  const pendingDataRef = useRef<Step1Values | null>(null);
  const [isProcessingOrder, setIsProcessingOrder] = useState(false);
  const [orderStep, setOrderStep] = useState<"form" | "generating-pdf" | "placing-order" | "confirmed">("form");
  const [orderResult, setOrderResult] = useState<LuluOrderResponse | null>(null);
  const [shippingAddress, setShippingAddress] = useState({
    name: "",
    street1: "",
    street2: "",
    city: "",
    state_code: "",
    country_code: "US",
    postcode: "",
    phone_number: "",
    email: "",
  });
  const [shippingLevel, setShippingLevel] = useState<"MAIL" | "PRIORITY_MAIL" | "GROUND" | "EXPEDITED" | "EXPRESS">("GROUND");
  const [editorPages, setEditorPages] = useState<(ColoringPage & { caption: string })[]>([]);
  const [generationComplete, setGenerationComplete] = useState(false);

  // Cover design state
  const [coverTemplate, setCoverTemplate] = useState<CoverTemplateId>("classic");
  const [coverTitle, setCoverTitle] = useState("");
  const [coverSubtitle, setCoverSubtitle] = useState("");
  const [coverTagline, setCoverTagline] = useState("");

  const createBook = useCreateBook();
  const requestUploadUrl = useRequestUploadUrl();
  const createPhoto = useCreatePhoto();
  const generatePages = useGenerateBookPages();
  const updateBook = useUpdateBook();
  const updatePage = useUpdatePage();
  const generatePdf = useGenerateBookPdf();
  const createLuluOrder = useCreateLuluOrder();
  const queryClient = useQueryClient();

  const dndSensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Poll book status during step 3 (generating) until ready
  const { data: bookData } = useGetBook(bookId ?? 0, {
    query: {
      enabled: step === 3 && !!bookId,
      refetchInterval: (query) => {
        const status = query.state.data?.status;
        return status === BookStatus.ready || status === BookStatus.ordered ? false : 3000;
      },
      queryKey: getGetBookQueryKey(bookId ?? 0),
    },
  });

  // Poll individual page statuses during generation to show per-image progress
  const { data: generatingPagesData } = useListBookPages(bookId ?? 0, {
    query: {
      enabled: step === 3 && !generationComplete && !!bookId,
      refetchInterval: 2000,
    },
  });

  // Fetch pages once generation completes
  const { data: pagesData } = useListBookPages(bookId ?? 0, {
    query: { enabled: step === 3 && bookData?.status === BookStatus.ready && !!bookId },
  });

  useEffect(() => {
    if (step === 3 && bookData?.status === BookStatus.ready && pagesData) {
      const sorted = [...pagesData].sort((a, b) => a.sortOrder - b.sortOrder);
      setEditorPages(sorted.map(p => ({ ...p, caption: p.caption ?? "" })));
      // Pre-fill cover fields from book data (only on first load)
      if (bookData.title && !coverTitle) setCoverTitle(bookData.title);
      if (bookData.subtitle && !coverSubtitle) setCoverSubtitle(bookData.subtitle ?? "");
      if (bookData.coverTagline && !coverTagline) setCoverTagline(bookData.coverTagline ?? "");
      if (bookData.coverTemplate) setCoverTemplate(bookData.coverTemplate as CoverTemplateId);
      setGenerationComplete(true);
    }
  }, [bookData?.status, pagesData, step]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<Step1Values>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      title: "",
      subtitle: "",
      dedication: "",
      style: BookStyle.cartoon
    }
  });

  const proceedWithBookCreation = async (data: Step1Values) => {
    try {
      const book = await createBook.mutateAsync({
        data: {
          title: data.title,
          subtitle: data.subtitle || null,
          dedication: data.dedication || null,
          style: data.style as CreateBookBodyStyle
        }
      });
      setBookId(book.id);
      setStep(2);
      window.scrollTo(0, 0);
    } catch (error) {
      toast({
        title: "Error creating book",
        description: "Please try again.",
        variant: "destructive"
      });
    }
  };

  const onSubmitStep1 = async (data: Step1Values) => {
    if (!isSignedIn) {
      pendingDataRef.current = data;
      setShowAuthModal(true);
      return;
    }
    await proceedWithBookCreation(data);
  };

  useEffect(() => {
    if (isSignedIn && pendingDataRef.current && showAuthModal) {
      setShowAuthModal(false);
      const data = pendingDataRef.current;
      pendingDataRef.current = null;
      proceedWithBookCreation(data);
    }
  }, [isSignedIn]);

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const newFiles = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files).filter(f => f.type.startsWith('image/'));
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const addFilesFromUrls = useCallback(async (urls: { url: string; name: string }[]) => {
    try {
      const fetched = await Promise.all(
        urls.map(async ({ url, name }) => {
          const res = await fetch(url);
          const blob = await res.blob();
          const ext = blob.type.split("/")[1] || "jpg";
          return new File([blob], name || `photo.${ext}`, { type: blob.type });
        })
      );
      setFiles(prev => [...prev, ...fetched.filter(f => f.type.startsWith("image/"))]);
    } catch {
      toast({ title: "Failed to load photos", description: "Could not fetch the selected files.", variant: "destructive" });
    }
  }, [toast]);

  const openDropboxChooser = useCallback(() => {
    const appKey = import.meta.env.VITE_DROPBOX_APP_KEY;
    if (!appKey) {
      toast({ title: "Dropbox not configured", description: "Set VITE_DROPBOX_APP_KEY to enable Dropbox uploads.", variant: "destructive" });
      return;
    }
    const existing = document.getElementById("dropboxjs");
    const launch = () => {
      (window as any).Dropbox.choose({
        success: (files: { link: string; name: string }[]) => {
          addFilesFromUrls(files.map(f => ({ url: f.link, name: f.name })));
        },
        linkType: "direct",
        multiselect: true,
        extensions: [".jpg", ".jpeg", ".png", ".webp"],
      });
    };
    if (existing) { launch(); return; }
    const script = document.createElement("script");
    script.src = "https://www.dropbox.com/static/api/2/dropins.js";
    script.id = "dropboxjs";
    script.setAttribute("data-app-key", appKey);
    script.onload = launch;
    document.body.appendChild(script);
  }, [addFilesFromUrls, toast]);

  const openGoogleDrivePicker = useCallback(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!apiKey || !clientId) {
      toast({ title: "Google Drive not configured", description: "Set VITE_GOOGLE_API_KEY and VITE_GOOGLE_CLIENT_ID to enable Google Drive uploads.", variant: "destructive" });
      return;
    }
    const launch = () => {
      const gapi = (window as any).gapi;
      gapi.load("auth2:picker", () => {
        gapi.auth2.getAuthInstance()?.signIn().then(() => {
          const token = gapi.auth2.getAuthInstance().currentUser.get().getAuthResponse().access_token;
          const picker = new (window as any).google.picker.PickerBuilder()
            .addView(new (window as any).google.picker.View((window as any).google.picker.ViewId.PHOTOS))
            .setOAuthToken(token)
            .setDeveloperKey(apiKey)
            .setCallback((data: any) => {
              if (data.action === "picked") {
                const items = data.docs.map((d: any) => ({
                  url: `https://www.googleapis.com/drive/v3/files/${d.id}?alt=media&key=${apiKey}`,
                  name: d.name,
                }));
                addFilesFromUrls(items);
              }
            })
            .build();
          picker.setVisible(true);
        });
      });
    };
    if ((window as any).gapi) { launch(); return; }
    const script = document.createElement("script");
    script.src = "https://apis.google.com/js/api.js";
    script.onload = launch;
    document.body.appendChild(script);
  }, [addFilesFromUrls, toast]);

  const openFacebookPicker = useCallback(() => {
    const appId = import.meta.env.VITE_FACEBOOK_APP_ID;
    if (!appId) {
      toast({ title: "Facebook not configured", description: "Set VITE_FACEBOOK_APP_ID to enable Facebook photo imports.", variant: "destructive" });
      return;
    }
    const launch = () => {
      const FB = (window as any).FB;
      FB.login((loginResp: any) => {
        if (!loginResp.authResponse) return;
        FB.api("/me/photos/uploaded", { fields: "images", limit: 100 }, (data: any) => {
          if (!data?.data) return;
          const urls = data.data.flatMap((photo: any) =>
            photo.images?.slice(0, 1).map((img: any) => ({ url: img.source, name: `fb_${photo.id}.jpg` })) ?? []
          );
          addFilesFromUrls(urls);
        });
      }, { scope: "user_photos" });
    };
    if ((window as any).FB) { launch(); return; }
    (window as any).fbAsyncInit = () => {
      (window as any).FB.init({ appId, version: "v19.0", xfbml: false, cookie: false });
      launch();
    };
    const script = document.createElement("script");
    script.src = "https://connect.facebook.net/en_US/sdk.js";
    document.body.appendChild(script);
  }, [addFilesFromUrls, toast]);

  const handleUploadAndGenerate = async () => {
    if (!bookId || files.length === 0) return;
    
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      // Upload each file
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // 1. Get upload URL
        const { uploadURL, objectPath } = await requestUploadUrl.mutateAsync({
          data: {
            name: file.name,
            size: file.size,
            contentType: file.type
          }
        });
        
        // 2. PUT to GCS directly
        await fetch(uploadURL, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file
        });
        
        // 3. Register photo with our API
        await createPhoto.mutateAsync({
          data: {
            bookId,
            objectPath,
            fileName: file.name
          }
        });
        
        setUploadProgress(Math.round(((i + 1) / files.length) * 100));
      }
      
      // All uploaded — trigger generation and move to step 3 to poll for completion
      setStep(3);
      await generatePages.mutateAsync({ id: bookId });
      // Step 3 will poll bookData.status and auto-advance to step 4 when ready
      
    } catch (error) {
      toast({
        title: "Error uploading photos",
        description: "There was a problem. Please try again.",
        variant: "destructive"
      });
      setIsUploading(false);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setEditorPages((pages) => {
        const oldIdx = pages.findIndex(p => p.id === active.id);
        const newIdx = pages.findIndex(p => p.id === over.id);
        return arrayMove(pages, oldIdx, newIdx);
      });
    }
  };

  const handleCaptionChange = (id: number, caption: string) => {
    setEditorPages(pages => pages.map(p => p.id === id ? { ...p, caption } : p));
  };

  const handleFinalizeBook = async () => {
    if (!bookId) return;
    // Save sort orders, captions, and cover design settings in parallel
    await Promise.all([
      ...editorPages.map((page, idx) =>
        updatePage.mutateAsync({ id: page.id, data: { sortOrder: idx, caption: page.caption || null } })
      ),
      updateBook.mutateAsync({
        id: bookId,
        data: {
          title: coverTitle || undefined,
          subtitle: coverSubtitle || null,
          coverTemplate: coverTemplate as any,
          coverTagline: coverTagline || null,
        }
      }),
    ]);
    setStep(4);
  };

  const handleOrder = async () => {
    if (!bookId) return;

    const required = ["name", "street1", "city", "country_code", "postcode", "phone_number", "email"] as const;
    const missing = required.filter(f => !shippingAddress[f]?.trim());
    if (missing.length > 0) {
      toast({ title: "Missing shipping info", description: "Please fill all required fields.", variant: "destructive" });
      return;
    }

    setIsProcessingOrder(true);
    setOrderStep("generating-pdf");
    try {
      await generatePdf.mutateAsync({ id: bookId });

      setOrderStep("placing-order");

      const contactEmail = shippingAddress.email;
      const addrPayload = {
        name: shippingAddress.name,
        street1: shippingAddress.street1,
        street2: shippingAddress.street2 || undefined,
        city: shippingAddress.city,
        state_code: shippingAddress.state_code || undefined,
        country_code: shippingAddress.country_code,
        postcode: shippingAddress.postcode,
        phone_number: shippingAddress.phone_number,
        email: shippingAddress.email,
      };

      const result = await createLuluOrder.mutateAsync({
        id: bookId,
        data: {
          contactEmail,
          shippingAddress: addrPayload,
          shippingLevel,
        },
      });

      queryClient.setQueryData(getGetBookQueryKey(bookId), (old: any) =>
        old ? { ...old, status: BookStatus.ordered, luluPrintJobId: String(result.printJobId) } : old
      );

      setOrderResult(result);
      setOrderStep("confirmed");
      toast({ title: "Order placed!", description: "Your coloring book is being printed." });
    } catch (err) {
      toast({ title: "Order failed", description: (err as Error).message, variant: "destructive" });
      setOrderStep("form");
    } finally {
      setIsProcessingOrder(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Progress Bar */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4 relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-muted -z-10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-500 ease-in-out"
                style={{ width: `${((step - 1) / 3) * 100}%` }}
              />
            </div>
            
            {[
              { num: 1, label: "Book Details" },
              { num: 2, label: "Add Photos" },
              { num: 3, label: "Generate Pages" },
              { num: 4, label: "Order Book" },
            ].map((s) => (
              <div key={s.num} className="flex flex-col items-center gap-2 bg-background px-2">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center font-bold font-serif text-lg transition-colors border-2",
                  step >= s.num 
                    ? "bg-primary border-primary text-primary-foreground" 
                    : "bg-background border-muted text-muted-foreground"
                )}>
                  {step > s.num ? <Sparkles className="w-5 h-5" /> : s.num}
                </div>
                <span className={cn(
                  "text-xs font-medium uppercase tracking-wider",
                  step >= s.num ? "text-foreground" : "text-muted-foreground"
                )}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Step 1: Details */}
        {step === 1 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center mb-10">
              <h1 className="text-4xl font-serif font-bold mb-3">Let's craft your book</h1>
              <p className="text-muted-foreground text-lg">Give it a title and choose the perfect artistic style.</p>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmitStep1)} className="space-y-8">
                <Card className="p-8 rounded-[2rem] border-border shadow-sm">
                  <div className="space-y-6">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-serif">Book Title <span className="text-destructive">*</span></FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Adventures of Tommy & Rex" className="h-14 text-lg bg-muted/50 border-transparent focus-visible:bg-background rounded-xl" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="subtitle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-serif">Subtitle (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Summer 2024" className="h-14 text-lg bg-muted/50 border-transparent focus-visible:bg-background rounded-xl" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="dedication"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-serif">Dedication Page (Optional)</FormLabel>
                          <FormControl>
                            <textarea 
                              placeholder="e.g. To my favorite little artist..." 
                              className="flex min-h-[120px] w-full rounded-xl border border-transparent bg-muted/50 px-3 py-4 text-lg ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:bg-background resize-none"
                              {...field}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </Card>

                <div>
                  <h3 className="text-2xl font-serif font-bold mb-4">Choose a Style</h3>
                  <div className="grid md:grid-cols-3 gap-6">
                    {[
                      { id: BookStyle.simple, name: "Simple", desc: "For toddlers & crayons", img: simpleStyleImg },
                      { id: BookStyle.cartoon, name: "Cartoon", desc: "For kids & markers", img: cartoonStyleImg },
                      { id: BookStyle.detailed, name: "Detailed", desc: "For older kids & pencils", img: detailedStyleImg }
                    ].map((styleOption) => (
                      <div 
                        key={styleOption.id}
                        className={cn(
                          "cursor-pointer rounded-[2rem] border-4 p-4 transition-all duration-300 bg-card",
                          form.watch("style") === styleOption.id 
                            ? "border-primary shadow-lg scale-105" 
                            : "border-transparent hover:border-border hover:bg-muted/30"
                        )}
                        onClick={() => form.setValue("style", styleOption.id as BookStyle)}
                      >
                        <div className="rounded-2xl overflow-hidden mb-4 aspect-square bg-muted">
                          <img src={styleOption.img} alt={styleOption.name} className="w-full h-full object-cover" />
                        </div>
                        <h4 className="font-serif font-bold text-xl text-center">{styleOption.name}</h4>
                        <p className="text-sm text-muted-foreground text-center">{styleOption.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button type="submit" size="lg" className="rounded-full h-14 px-10 text-lg bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-all" disabled={createBook.isPending}>
                    {createBook.isPending ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                    Next: Add Photos
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        )}

        {/* Step 2: Upload */}
        {step === 2 && (
          <div className="animate-in fade-in slide-in-from-right-8 duration-500">
            <div className="text-center mb-10">
              <h1 className="text-4xl font-serif font-bold mb-3">Add your memories</h1>
              <p className="text-muted-foreground text-lg">Upload 2–40 photos — each becomes a coloring page. Clear faces and simple backgrounds work best.</p>
            </div>

            {/* Source picker card */}
            <Card className="rounded-[2rem] border-border shadow-sm mb-8 overflow-visible">
              <div className="flex min-h-[420px] rounded-[2rem] overflow-hidden">

                {/* Left sidebar — source selector */}
                <div className="w-56 flex-shrink-0 bg-muted/40 border-r border-border flex flex-col py-3 overflow-visible relative z-10">
                  {([
                    {
                      id: "device",
                      label: "My Device",
                      comingSoon: false,
                      icon: (
                        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
                      ),
                    },
                    {
                      id: "facebook",
                      label: "Facebook",
                      comingSoon: false,
                      icon: (
                        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                      ),
                    },
                    {
                      id: "dropbox",
                      label: "Dropbox",
                      comingSoon: true,
                      icon: (
                        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M12 6.036l-6 3.826 6 3.826-6 3.826L0 13.688l6-3.826-6-3.826L6 2.21l6 3.826zM6.032 18.331l6-3.826 6 3.826-6 3.826-6-3.826zm6-4.643l6-3.826-6-3.826 6-3.826 6 3.826-6 3.826z"/></svg>
                      ),
                    },
                    {
                      id: "googledrive",
                      label: "Google Drive",
                      comingSoon: true,
                      icon: (
                        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M6.28 3l5.72 9.9L6.28 21H1.72L7.44 12 1.72 3h4.56zm5.44 0h4.56l5.72 9H12l-.28-.49zm4.56 18H6.28l2.72-4.5h10.44L22 21h-5.72z" fillRule="evenodd"/></svg>
                      ),
                    },
                  ] as const).map(src => (
                    <div key={src.id} className="relative group/src">
                      <button
                        type="button"
                        disabled={src.comingSoon}
                        onClick={() => !src.comingSoon && setUploadSource(src.id)}
                        className={cn(
                          "w-full flex items-center gap-3 px-5 py-3.5 text-left transition-colors text-sm font-medium",
                          src.comingSoon
                            ? "opacity-40 cursor-not-allowed"
                            : uploadSource === src.id
                              ? "bg-background text-foreground border-r-2 border-primary shadow-sm"
                              : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                        )}
                      >
                        <span className={!src.comingSoon && uploadSource === src.id ? "text-primary" : ""}>{src.icon}</span>
                        {src.label}
                      </button>
                      {src.comingSoon && (
                        <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 z-50 opacity-0 group-hover/src:opacity-100 transition-opacity duration-150">
                          <div className="bg-foreground text-background text-xs font-medium px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-lg">
                            Coming soon
                            <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-foreground" />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Right content area */}
                <div className="flex-1 flex flex-col p-8">
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    multiple
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileInput}
                  />

                  {uploadSource === "device" && (
                    <div
                      className="flex-1 border-3 border-dashed border-border rounded-3xl flex flex-col items-center justify-center text-center bg-muted/10 hover:bg-muted/30 transition-colors cursor-pointer group"
                      style={{ borderWidth: "3px", borderStyle: "dashed" }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={handleFileDrop}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <div className="w-16 h-16 bg-background rounded-full flex items-center justify-center mb-5 shadow-sm group-hover:scale-110 transition-transform">
                        <UploadCloud className="w-8 h-8 text-primary" />
                      </div>
                      <h3 className="text-xl font-serif font-bold mb-1">Drag & drop photos here</h3>
                      <p className="text-muted-foreground text-sm mb-5">JPG, PNG or WebP</p>
                      <Button type="button" size="sm" className="rounded-full px-6" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                        Choose files
                      </Button>
                    </div>
                  )}

                  {uploadSource === "facebook" && (
                    <div className="flex-1 flex flex-col items-center justify-center text-center gap-5">
                      <div className="w-16 h-16 rounded-full bg-[#1877F2]/10 flex items-center justify-center">
                        <svg viewBox="0 0 24 24" className="w-8 h-8 text-[#1877F2]" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                      </div>
                      <div>
                        <h3 className="text-xl font-serif font-bold mb-1">Import from Facebook</h3>
                        <p className="text-muted-foreground text-sm">Select photos from your Facebook albums</p>
                      </div>
                      <Button className="rounded-full px-8 bg-[#1877F2] hover:bg-[#1877F2]/90 text-white" onClick={openFacebookPicker}>
                        Connect Facebook
                      </Button>
                    </div>
                  )}

                  {uploadSource === "dropbox" && (
                    <div className="flex-1 flex flex-col items-center justify-center text-center gap-5">
                      <div className="w-16 h-16 rounded-full bg-[#0061FF]/10 flex items-center justify-center">
                        <svg viewBox="0 0 24 24" className="w-8 h-8 text-[#0061FF]" fill="currentColor"><path d="M12 6.036l-6 3.826 6 3.826-6 3.826L0 13.688l6-3.826-6-3.826L6 2.21l6 3.826zM6.032 18.331l6-3.826 6 3.826-6 3.826-6-3.826zm6-4.643l6-3.826-6-3.826 6-3.826 6 3.826-6 3.826z"/></svg>
                      </div>
                      <div>
                        <h3 className="text-xl font-serif font-bold mb-1">Import from Dropbox</h3>
                        <p className="text-muted-foreground text-sm">Browse and select photos from your Dropbox</p>
                      </div>
                      <Button className="rounded-full px-8 bg-[#0061FF] hover:bg-[#0061FF]/90 text-white" onClick={openDropboxChooser}>
                        Open Dropbox
                      </Button>
                    </div>
                  )}

                  {uploadSource === "googledrive" && (
                    <div className="flex-1 flex flex-col items-center justify-center text-center gap-5">
                      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                        <svg viewBox="0 0 87.3 78" className="w-8 h-8" fill="none">
                          <path d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3L27.5 53H0c0 1.55.4 3.1 1.2 4.5z" fill="#0066DA"/>
                          <path d="M43.65 25L29.9 1.4c-1.35.8-2.5 1.9-3.3 3.3L1.2 48.5A9 9 0 000 53h27.5z" fill="#00AC47"/>
                          <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5H59.8L73.55 76.8z" fill="#EA4335"/>
                          <path d="M43.65 25L57.4 1.4C56.05.6 54.5.2 52.95.2H34.35c-1.55 0-3.1.4-4.45 1.2z" fill="#00832D"/>
                          <path d="M59.8 53H27.5L13.75 76.8c1.35.8 2.9 1.2 4.45 1.2h50.9c1.55 0 3.1-.4 4.45-1.2z" fill="#2684FC"/>
                          <path d="M73.4 26.5l-12.65-21.8c-.8-1.4-1.95-2.5-3.3-3.3L43.65 25 59.8 53h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#FFBA00"/>
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-xl font-serif font-bold mb-1">Import from Google Drive</h3>
                        <p className="text-muted-foreground text-sm">Select photos from your Google Drive</p>
                      </div>
                      <Button className="rounded-full px-8" onClick={openGoogleDrivePicker}>
                        Connect Google Drive
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Selected photos strip (shown below the picker when files are present) */}
              {files.length > 0 && (
                <div className="border-t border-border px-8 py-6">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-bold text-base">
                      {files.length} {files.length === 1 ? "photo" : "photos"} selected
                      {files.length < 2 && (
                        <span className="ml-2 text-sm font-normal text-amber-600">({2 - files.length} more needed)</span>
                      )}
                      {files.length >= 2 && (
                        <span className="ml-2 text-sm font-normal text-primary">✓ Ready</span>
                      )}
                    </h4>
                    <Button variant="ghost" size="sm" onClick={() => setFiles([])} className="text-muted-foreground hover:text-destructive text-sm">
                      Clear all
                    </Button>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5 mb-4">
                    <div
                      className={cn("h-full rounded-full transition-all duration-300", files.length >= 2 ? "bg-primary" : "bg-amber-400")}
                      style={{ width: `${Math.min((files.length / 2) * 100, 100)}%` }}
                    />
                  </div>
                  <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                    {files.map((file, i) => (
                      <div key={i} className="relative group aspect-square rounded-xl overflow-hidden border border-border shadow-sm">
                        <img src={URL.createObjectURL(file)} alt="upload preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Button
                            variant="destructive"
                            size="icon"
                            className="rounded-full w-7 h-7"
                            onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="aspect-square rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <span className="text-2xl leading-none mb-1">+</span>
                      <span className="text-xs">Add more</span>
                    </button>
                  </div>
                </div>
              )}
            </Card>

            <div className="flex justify-between pt-4">
              <Button variant="outline" size="lg" className="rounded-full h-14 px-8 text-lg" onClick={() => setStep(1)} disabled={isUploading}>
                Back
              </Button>
              <Button 
                onClick={handleUploadAndGenerate} 
                size="lg" 
                className="rounded-full h-14 px-10 text-lg bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-all"
                disabled={files.length < 2 || isUploading}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Uploading... {uploadProgress}%
                  </>
                ) : (
                  <>
                    <Wand2 className="w-5 h-5 mr-2" />
                    Generate Book
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Generate Pages — Loading phase */}
        {step === 3 && !generationComplete && (() => {
          const allPages = generatingPagesData ?? [];
          const total = allPages.length;
          const readyCount = allPages.filter(p => p.status === "ready").length;
          const currentlyGenerating = allPages.find(p => p.status === "generating");
          const currentIndex = currentlyGenerating
            ? allPages.findIndex(p => p.id === currentlyGenerating.id)
            : readyCount;
          const progressPct = total > 0 ? Math.round((readyCount / total) * 100) : 0;

          return (
            <div className="animate-in fade-in zoom-in-95 duration-1000 text-center py-16">
              <div className="relative w-32 h-32 mx-auto mb-8">
                <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping"></div>
                <div className="absolute inset-2 bg-accent/30 rounded-full animate-pulse delay-150"></div>
                <div className="absolute inset-4 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-xl">
                  <Wand2 className="w-12 h-12 animate-bounce" />
                </div>
              </div>
              <h1 className="text-4xl font-serif font-bold mb-3">Sprinkling Magic Dust…</h1>
              <p className="text-lg text-muted-foreground max-w-lg mx-auto mb-10">
                Our AI is carefully tracing each photo into a coloring page. This usually takes 1–3 minutes.
              </p>

              {total > 0 && (
                <div className="max-w-md mx-auto">
                  {/* Progress bar */}
                  <div className="flex items-center justify-between text-sm font-medium mb-2">
                    <span className="text-muted-foreground">
                      {currentlyGenerating
                        ? `Converting photo ${currentIndex + 1} of ${total}…`
                        : readyCount < total
                          ? `Starting next photo…`
                          : `Wrapping up…`}
                    </span>
                    <span className="text-primary font-bold">{readyCount} / {total}</span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-700 ease-out"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>

                  {/* Mini thumbnails of completed pages */}
                  {readyCount > 0 && (
                    <div className="mt-6 flex flex-wrap gap-2 justify-center">
                      {allPages
                        .filter(p => p.status === "ready" && p.coloringImagePath)
                        .slice(-8)
                        .map((p) => (
                          <div
                            key={p.id}
                            className="w-12 h-12 rounded-lg overflow-hidden border-2 border-primary/30 animate-in fade-in zoom-in-95 duration-300 bg-muted"
                          >
                            <img
                              src={getImageUrl(p.coloringImagePath!)}
                              alt="Completed page"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })()}

        {/* Step 3: Generate Pages — Page Editor + Cover Designer phase */}
        {step === 3 && generationComplete && (() => {
          const selectedTpl = COVER_TEMPLATES.find(t => t.id === coverTemplate) ?? COVER_TEMPLATES[0];
          return (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-10">
              {/* ── Cover Designer ── */}
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <BookIcon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-serif font-bold">Design Your Cover</h2>
                    <p className="text-sm text-muted-foreground">Choose a template and personalise the text.</p>
                  </div>
                </div>

                <div className="grid lg:grid-cols-3 gap-6">
                  {/* Left: template picker */}
                  <div className="lg:col-span-2 space-y-4">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Choose a Template</h3>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                      {COVER_TEMPLATES.map((tpl) => (
                        <button
                          key={tpl.id}
                          onClick={() => setCoverTemplate(tpl.id)}
                          className={cn(
                            "flex flex-col items-center gap-2 rounded-2xl p-2 border-2 transition-all duration-200",
                            coverTemplate === tpl.id
                              ? "border-primary shadow-md scale-105"
                              : "border-transparent hover:border-border"
                          )}
                        >
                          <div style={{ width: 80, height: 104 }}>
                            <CoverPreview template={tpl} title={coverTitle || "Title"} subtitle={coverSubtitle} tagline={coverTagline} small />
                          </div>
                          <span className="text-xs font-medium">{tpl.name}</span>
                        </button>
                      ))}
                    </div>

                    {/* Text fields */}
                    <div className="space-y-4 mt-4">
                      <div>
                        <label className="text-sm font-semibold text-foreground block mb-1.5">Cover Title</label>
                        <Input
                          value={coverTitle}
                          onChange={e => setCoverTitle(e.target.value)}
                          placeholder="e.g. Adventures of Tommy & Rex"
                          className="h-11 bg-muted/50 border-transparent focus-visible:bg-background rounded-xl"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-foreground block mb-1.5">Subtitle <span className="text-muted-foreground font-normal">(optional)</span></label>
                        <Input
                          value={coverSubtitle}
                          onChange={e => setCoverSubtitle(e.target.value)}
                          placeholder="e.g. Summer 2024"
                          className="h-11 bg-muted/50 border-transparent focus-visible:bg-background rounded-xl"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-foreground block mb-1.5">Tagline <span className="text-muted-foreground font-normal">(optional)</span></label>
                        <Input
                          value={coverTagline}
                          onChange={e => setCoverTagline(e.target.value)}
                          placeholder="e.g. Made with Love · A Family Coloring Book"
                          className="h-11 bg-muted/50 border-transparent focus-visible:bg-background rounded-xl"
                        />
                        <p className="text-xs text-muted-foreground mt-1">Shown below the title on the cover. Defaults to "A Personalized Coloring Book".</p>
                      </div>
                    </div>
                  </div>

                  {/* Right: live preview */}
                  <div className="flex flex-col items-center gap-3">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground self-start">Live Preview</h3>
                    <div className="w-full max-w-[220px] aspect-[3/4] rounded-2xl overflow-hidden shadow-xl border border-border/50">
                      <CoverPreview
                        template={selectedTpl}
                        title={coverTitle || "Book Title"}
                        subtitle={coverSubtitle}
                        tagline={coverTagline}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      {selectedTpl.name} — {selectedTpl.description}
                    </p>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-border" />

              {/* ── Page Arranger ── */}
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-serif font-bold">Arrange Your Pages</h2>
                    <p className="text-sm text-muted-foreground">Drag to reorder, and add an optional caption beneath each illustration.</p>
                  </div>
                </div>

                <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={editorPages.map(p => p.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-3 mb-8">
                      {editorPages.map((page, idx) => (
                        <SortablePageRow
                          key={page.id}
                          page={page}
                          index={idx}
                          onCaptionChange={handleCaptionChange}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>

              <div className="flex justify-between pt-2 pb-6">
                <Button variant="outline" size="lg" className="rounded-full h-14 px-8 text-lg" onClick={() => { setGenerationComplete(false); setStep(2); }}>
                  Back
                </Button>
                <Button
                  size="lg"
                  className="rounded-full h-14 px-10 text-lg bg-primary hover:bg-primary/90 text-primary-foreground shadow-md"
                  onClick={handleFinalizeBook}
                  disabled={updatePage.isPending || updateBook.isPending}
                >
                  {(updatePage.isPending || updateBook.isPending) ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                  Next: Order Book
                </Button>
              </div>
            </div>
          );
        })()}

        {/* Step 4: Order Book */}
        {step === 4 && (() => {
          const pageCount = editorPages.length || (bookData?.pageCount ?? 0);
          const price = getPriceForPages(pageCount);
          const tierLabel = getPriceTierLabel(pageCount);

          if (orderStep === "generating-pdf") {
            return (
              <div className="animate-in fade-in zoom-in-95 duration-500 text-center py-20">
                <div className="relative w-28 h-28 mx-auto mb-8">
                  <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
                  <div className="absolute inset-4 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-xl">
                    <FileDown className="w-10 h-10 animate-bounce" />
                  </div>
                </div>
                <h1 className="text-3xl font-serif font-bold mb-3">Building your book PDF…</h1>
                <p className="text-muted-foreground">Assembling all your coloring pages into a print-ready file.</p>
              </div>
            );
          }

          if (orderStep === "placing-order") {
            return (
              <div className="animate-in fade-in zoom-in-95 duration-500 text-center py-20">
                <div className="relative w-28 h-28 mx-auto mb-8">
                  <div className="absolute inset-0 bg-accent/20 rounded-full animate-ping" />
                  <div className="absolute inset-4 bg-accent text-accent-foreground rounded-full flex items-center justify-center shadow-xl">
                    <BookIcon className="w-10 h-10 animate-bounce" />
                  </div>
                </div>
                <h1 className="text-3xl font-serif font-bold mb-3">Sending to the printer…</h1>
                <p className="text-muted-foreground">Your order is being placed with our print partner. Hang tight!</p>
              </div>
            );
          }

          if (orderStep === "confirmed") {
            const arrivalMin = orderResult?.estimatedShipping?.arrival_min;
            const arrivalMax = orderResult?.estimatedShipping?.arrival_max;
            return (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-6">
                  <Check className="w-10 h-10 text-green-600" />
                </div>
                <h1 className="text-4xl font-serif font-bold mb-3">Order Confirmed!</h1>
                <p className="text-lg text-muted-foreground mb-8">
                  Your personalized coloring book is heading to the printer. You'll receive a shipping notification by email.
                </p>

                {orderResult && (
                  <div className="bg-muted/40 rounded-2xl border border-border p-6 text-left mb-8">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-sm text-muted-foreground">Order ID</span>
                      <span className="font-mono font-bold">#{orderResult.printJobId}</span>
                    </div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-sm text-muted-foreground">Status</span>
                      <span className="font-semibold text-green-600">{orderResult.status?.name ?? "CREATED"}</span>
                    </div>
                    {arrivalMin && arrivalMax && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Estimated Arrival</span>
                        <span className="font-semibold">{arrivalMin} – {arrivalMax}</span>
                      </div>
                    )}
                  </div>
                )}

                <Button
                  size="lg"
                  className="rounded-full h-14 px-10 text-lg"
                  onClick={() => setLocation(`/books/${bookId}/share`)}
                >
                  Share Your Book
                </Button>
              </div>
            );
          }

          return (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto">
              <div className="text-center mb-10">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                  <BookIcon className="w-8 h-8 text-primary" />
                </div>
                <h1 className="text-4xl font-serif font-bold mb-2">Order your book</h1>
                <p className="text-lg text-muted-foreground">Ready to print and ship to your door.</p>
              </div>

              {/* Pricing Tiers */}
              <div className="bg-muted/40 rounded-2xl border border-border p-5 mb-6">
                <h3 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Pricing by page count</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: "10–20 pages", price: "$24.95" },
                    { label: "21–30 pages", price: "$29.95" },
                    { label: "31–40 pages", price: "$34.95" },
                    { label: "40+ pages", price: "$49.95" },
                  ].map((tier) => (
                    <div
                      key={tier.label}
                      className={cn(
                        "rounded-xl p-3 text-center border-2 transition-colors",
                        tier.label === tierLabel
                          ? "border-primary bg-primary/5"
                          : "border-transparent bg-card"
                      )}
                    >
                      <div className="font-bold text-lg">{tier.price}</div>
                      <div className="text-xs text-muted-foreground">{tier.label}</div>
                      {tier.label === tierLabel && (
                        <div className="text-xs font-semibold text-primary mt-1">Your book</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Shipping Address Form */}
              <div className="bg-card rounded-2xl border border-border p-6 shadow-sm mb-6">
                  <h3 className="font-serif font-bold text-xl mb-5">Shipping Address</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium mb-1">Full Name <span className="text-destructive">*</span></label>
                      <Input
                        placeholder="Jane Smith"
                        value={shippingAddress.name}
                        onChange={e => setShippingAddress(s => ({ ...s, name: e.target.value }))}
                        className="bg-muted/50 border-transparent focus-visible:bg-background rounded-xl h-11"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium mb-1">Email <span className="text-destructive">*</span></label>
                      <Input
                        type="email"
                        placeholder="jane@example.com"
                        value={shippingAddress.email}
                        onChange={e => setShippingAddress(s => ({ ...s, email: e.target.value }))}
                        className="bg-muted/50 border-transparent focus-visible:bg-background rounded-xl h-11"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium mb-1">Street Address <span className="text-destructive">*</span></label>
                      <Input
                        placeholder="123 Main St"
                        value={shippingAddress.street1}
                        onChange={e => setShippingAddress(s => ({ ...s, street1: e.target.value }))}
                        className="bg-muted/50 border-transparent focus-visible:bg-background rounded-xl h-11 mb-2"
                      />
                      <Input
                        placeholder="Apt, Suite, etc. (optional)"
                        value={shippingAddress.street2}
                        onChange={e => setShippingAddress(s => ({ ...s, street2: e.target.value }))}
                        className="bg-muted/50 border-transparent focus-visible:bg-background rounded-xl h-11"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">City <span className="text-destructive">*</span></label>
                      <Input
                        placeholder="New York"
                        value={shippingAddress.city}
                        onChange={e => setShippingAddress(s => ({ ...s, city: e.target.value }))}
                        className="bg-muted/50 border-transparent focus-visible:bg-background rounded-xl h-11"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">State / Region</label>
                      <Input
                        placeholder="NY"
                        value={shippingAddress.state_code}
                        onChange={e => setShippingAddress(s => ({ ...s, state_code: e.target.value }))}
                        className="bg-muted/50 border-transparent focus-visible:bg-background rounded-xl h-11"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">ZIP / Postcode <span className="text-destructive">*</span></label>
                      <Input
                        placeholder="10001"
                        value={shippingAddress.postcode}
                        onChange={e => setShippingAddress(s => ({ ...s, postcode: e.target.value }))}
                        className="bg-muted/50 border-transparent focus-visible:bg-background rounded-xl h-11"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Country Code <span className="text-destructive">*</span></label>
                      <Input
                        placeholder="US"
                        maxLength={2}
                        value={shippingAddress.country_code}
                        onChange={e => setShippingAddress(s => ({ ...s, country_code: e.target.value.toUpperCase() }))}
                        className="bg-muted/50 border-transparent focus-visible:bg-background rounded-xl h-11"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium mb-1">Phone Number <span className="text-destructive">*</span></label>
                      <Input
                        placeholder="+1 555 000 0000"
                        value={shippingAddress.phone_number}
                        onChange={e => setShippingAddress(s => ({ ...s, phone_number: e.target.value }))}
                        className="bg-muted/50 border-transparent focus-visible:bg-background rounded-xl h-11"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium mb-1">Shipping Speed</label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-1">
                        {([
                          { value: "MAIL", label: "Standard Mail", desc: "Slowest" },
                          { value: "GROUND", label: "Ground", desc: "3–7 days" },
                          { value: "EXPEDITED", label: "Expedited", desc: "2 days" },
                          { value: "EXPRESS", label: "Overnight", desc: "Fastest" },
                        ] as const).map(opt => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setShippingLevel(opt.value)}
                            className={cn(
                              "rounded-xl p-3 border-2 text-left transition-colors",
                              shippingLevel === opt.value
                                ? "border-primary bg-primary/5"
                                : "border-transparent bg-muted/50 hover:border-border"
                            )}
                          >
                            <div className="font-semibold text-sm">{opt.label}</div>
                            <div className="text-xs text-muted-foreground">{opt.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

              {/* Order Summary */}
              <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
                <div className="flex justify-between mb-2 text-muted-foreground text-sm">
                  <span>{pageCount} pages · {tierLabel}</span>
                  <span>{price}</span>
                </div>
                <div className="flex justify-between mb-4 text-muted-foreground text-sm">
                  <span>Shipping</span>
                  <span>Calculated at checkout</span>
                </div>
                <div className="flex justify-between pt-4 border-t border-border font-bold text-xl mb-6">
                  <span>Total</span>
                  <span>{price} + shipping</span>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-5">
                  <ShieldCheck className="w-4 h-4 text-primary flex-shrink-0" />
                  Printed & fulfilled by Lulu Press · 100% Satisfaction Guarantee
                </div>

                <Button
                  className="w-full h-14 rounded-full text-lg shadow-lg bg-accent hover:bg-accent/90 text-accent-foreground"
                  size="lg"
                  disabled={isProcessingOrder}
                  onClick={handleOrder}
                >
                  {isProcessingOrder ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    "Place Print Order"
                  )}
                </Button>
              </div>
            </div>
          );
        })()}

      </div>

      {/* Auth Modal */}
      <Dialog open={showAuthModal} onOpenChange={setShowAuthModal}>
        <DialogContent className="p-0 border-0 bg-transparent shadow-none max-w-fit overflow-visible">
          <DialogTitle className="sr-only">Sign up to continue</DialogTitle>
          <div className="flex flex-col items-center gap-4">
            {authView === "sign-up" ? (
              <SignUp
                routing="hash"
                signInUrl={`${basePath}/sign-in`}
                appearance={{ elements: { rootBox: "shadow-2xl rounded-[2rem] overflow-hidden" } }}
              />
            ) : (
              <SignIn
                routing="hash"
                signUpUrl={`${basePath}/sign-up`}
                appearance={{ elements: { rootBox: "shadow-2xl rounded-[2rem] overflow-hidden" } }}
              />
            )}
            <p className="text-sm text-muted-foreground">
              {authView === "sign-up" ? (
                <>Already have an account?{" "}
                  <button className="text-primary font-semibold underline underline-offset-2" onClick={() => setAuthView("sign-in")}>Sign in</button>
                </>
              ) : (
                <>Don't have an account?{" "}
                  <button className="text-primary font-semibold underline underline-offset-2" onClick={() => setAuthView("sign-up")}>Sign up</button>
                </>
              )}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
