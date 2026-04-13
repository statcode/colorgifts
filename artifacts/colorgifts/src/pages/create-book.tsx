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
  getGetBookQueryKey,
} from "@workspace/api-client-react";
import { BookStyle, CreateBookBodyStyle, BookStatus } from "@workspace/api-client-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Loader2, UploadCloud, X, Wand2, ImageIcon, Sparkles, FileDown, Book as BookIcon, Check, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

import simpleStyleImg from "@/assets/style-simple.png";
import cartoonStyleImg from "@/assets/style-cartoon.png";
import detailedStyleImg from "@/assets/style-detailed.png";

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
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authView, setAuthView] = useState<"sign-up" | "sign-in">("sign-up");
  const pendingDataRef = useRef<Step1Values | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<"digital" | "print" | null>(null);
  const [isProcessingOrder, setIsProcessingOrder] = useState(false);

  const createBook = useCreateBook();
  const requestUploadUrl = useRequestUploadUrl();
  const createPhoto = useCreatePhoto();
  const generatePages = useGenerateBookPages();
  const updateBook = useUpdateBook();
  const queryClient = useQueryClient();

  // Poll book status during step 3 (generating) until ready, then advance to step 4
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

  useEffect(() => {
    if (step === 3 && bookData?.status === BookStatus.ready) {
      setStep(4);
    }
  }, [bookData?.status, step]);

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

  const handleOrder = async () => {
    if (!selectedFormat || !bookId) return;
    setIsProcessingOrder(true);
    try {
      await new Promise(r => setTimeout(r, 1500));
      await updateBook.mutateAsync({ id: bookId, data: { status: BookStatus.ordered } });
      queryClient.setQueryData(getGetBookQueryKey(bookId), (old: any) =>
        old ? { ...old, status: BookStatus.ordered } : old
      );
      toast({ title: "Order confirmed!", description: "Your gift is on its way." });
      setLocation(`/books/${bookId}/share`);
    } catch {
      toast({ title: "Checkout failed", variant: "destructive" });
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
              <p className="text-muted-foreground text-lg">Upload up to 20 photos. Clear faces and simple backgrounds work best.</p>
            </div>

            <Card className="p-8 rounded-[2rem] border-border shadow-sm mb-8">
              <div 
                className="border-4 border-dashed border-border rounded-3xl p-12 text-center bg-muted/20 hover:bg-muted/50 transition-colors cursor-pointer relative overflow-hidden group"
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  multiple 
                  accept="image/jpeg,image/png,image/webp" 
                  onChange={handleFileInput} 
                />
                
                <div className="w-20 h-20 bg-background rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm group-hover:scale-110 transition-transform">
                  <UploadCloud className="w-10 h-10 text-primary" />
                </div>
                <h3 className="text-2xl font-serif font-bold mb-2">Drag & drop photos here</h3>
                <p className="text-muted-foreground">or click to browse from your device</p>
              </div>

              {files.length > 0 && (
                <div className="mt-8">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-bold text-lg">{files.length} {files.length === 1 ? 'photo' : 'photos'} added</h4>
                    <Button variant="ghost" size="sm" onClick={() => setFiles([])} className="text-muted-foreground hover:text-destructive">
                      Clear all
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {files.map((file, i) => (
                      <div key={i} className="relative group aspect-square rounded-2xl overflow-hidden border border-border shadow-sm">
                        <img 
                          src={URL.createObjectURL(file)} 
                          alt="upload preview" 
                          className="w-full h-full object-cover" 
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Button 
                            variant="destructive" 
                            size="icon" 
                            className="rounded-full w-8 h-8"
                            onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
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
                disabled={files.length === 0 || isUploading}
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

        {/* Step 3: Generate Pages */}
        {step === 3 && (
          <div className="animate-in fade-in zoom-in-95 duration-1000 text-center py-20">
            <div className="relative w-32 h-32 mx-auto mb-8">
              <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping"></div>
              <div className="absolute inset-2 bg-accent/30 rounded-full animate-pulse delay-150"></div>
              <div className="absolute inset-4 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-xl">
                <Wand2 className="w-12 h-12 animate-bounce" />
              </div>
            </div>
            <h1 className="text-4xl font-serif font-bold mb-4">Sprinkling Magic Dust...</h1>
            <p className="text-xl text-muted-foreground max-w-lg mx-auto">
              Our AI illustrators are carefully tracing your photos. This usually takes a minute or two. We'll move you forward automatically!
            </p>
          </div>
        )}

        {/* Step 4: Order Book */}
        {step === 4 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-4xl font-serif font-bold mb-2">Your book is ready!</h1>
              <p className="text-lg text-muted-foreground">Choose how you'd like to receive it.</p>
            </div>

            <div className="grid lg:grid-cols-5 gap-10">
              {/* Book Summary */}
              <div className="lg:col-span-2">
                <div className="bg-card rounded-3xl border border-border p-6 shadow-sm">
                  <div className="aspect-[4/3] bg-muted rounded-xl mb-6 overflow-hidden border border-border/50 flex flex-col items-center justify-center p-6 text-center bg-white">
                    <BookIcon className="w-12 h-12 text-primary/40 mb-3" />
                    <span className="font-serif text-xl font-bold mb-1">{bookData?.title ?? "Your Book"}</span>
                    <span className="text-sm text-muted-foreground capitalize">{bookData?.style} Style • {bookData?.pageCount ?? "—"} pages</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2 border-t border-border">
                    <ShieldCheck className="w-4 h-4 text-primary flex-shrink-0" />
                    100% Satisfaction Guarantee
                  </div>
                </div>
              </div>

              {/* Format + Checkout */}
              <div className="lg:col-span-3 space-y-4">
                {/* Digital Option */}
                <button
                  type="button"
                  onClick={() => setSelectedFormat("digital")}
                  className={cn(
                    "w-full text-left flex items-start p-6 rounded-2xl border-2 cursor-pointer transition-all",
                    selectedFormat === "digital"
                      ? "border-primary bg-primary/5 shadow-md"
                      : "border-border hover:border-primary/50 hover:bg-muted/30 bg-card"
                  )}
                >
                  <div className="flex items-center h-6 mr-4">
                    <div className={cn("w-5 h-5 rounded-full border flex items-center justify-center", selectedFormat === "digital" ? "border-primary bg-primary" : "border-input")}>
                      {selectedFormat === "digital" && <Check className="w-3 h-3 text-primary-foreground" />}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-bold text-lg flex items-center gap-2">
                        <FileDown className="w-5 h-5 text-muted-foreground" /> Digital PDF
                      </h3>
                      <span className="font-bold text-lg">$9.99</span>
                    </div>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      Instant download. High-res PDF, print at home as many times as you like. Perfect for gifting right away.
                    </p>
                  </div>
                </button>

                {/* Print Option */}
                <button
                  type="button"
                  onClick={() => setSelectedFormat("print")}
                  className={cn(
                    "w-full text-left flex items-start p-6 rounded-2xl border-2 cursor-pointer transition-all relative overflow-hidden",
                    selectedFormat === "print"
                      ? "border-accent bg-accent/5 shadow-md"
                      : "border-border hover:border-accent/50 hover:bg-muted/30 bg-card"
                  )}
                >
                  {selectedFormat === "print" && (
                    <div className="absolute top-0 right-0 bg-accent text-accent-foreground text-xs font-bold px-3 py-1 rounded-bl-lg">POPULAR</div>
                  )}
                  <div className="flex items-center h-6 mr-4">
                    <div className={cn("w-5 h-5 rounded-full border flex items-center justify-center", selectedFormat === "print" ? "border-accent bg-accent" : "border-input")}>
                      {selectedFormat === "print" && <Check className="w-3 h-3 text-accent-foreground" />}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-bold text-lg flex items-center gap-2">
                        <BookIcon className="w-5 h-5 text-muted-foreground" /> Premium Printed Book
                      </h3>
                      <span className="font-bold text-lg">$19.99</span>
                    </div>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      Beautifully bound softcover on thick paper. Ships free worldwide in 3-5 days. Includes digital PDF.
                    </p>
                    {selectedFormat === "print" && (
                      <p className="text-xs font-medium text-primary mt-3">
                        Estimated delivery: {new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </button>

                {/* Order Summary + Button */}
                <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
                  <div className="flex justify-between mb-2 text-muted-foreground text-sm">
                    <span>Subtotal</span>
                    <span>{selectedFormat === "print" ? "$19.99" : selectedFormat === "digital" ? "$9.99" : "$0.00"}</span>
                  </div>
                  <div className="flex justify-between mb-4 text-muted-foreground text-sm">
                    <span>Shipping</span>
                    <span>{selectedFormat === "print" ? "Free" : "—"}</span>
                  </div>
                  <div className="flex justify-between pt-4 border-t border-border font-bold text-xl mb-6">
                    <span>Total</span>
                    <span>{selectedFormat === "print" ? "$19.99" : selectedFormat === "digital" ? "$9.99" : "$0.00"}</span>
                  </div>

                  <Button
                    className="w-full h-14 rounded-full text-lg shadow-lg"
                    size="lg"
                    disabled={!selectedFormat || isProcessingOrder}
                    onClick={handleOrder}
                    style={{
                      backgroundColor: selectedFormat === "print" ? "hsl(var(--accent))" : "hsl(var(--primary))",
                      color: selectedFormat === "print" ? "hsl(var(--accent-foreground))" : "hsl(var(--primary-foreground))",
                    }}
                  >
                    {isProcessingOrder ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      `Pay ${selectedFormat === "print" ? "$19.99" : selectedFormat === "digital" ? "$9.99" : ""}`
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

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
