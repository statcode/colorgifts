import { Layout } from "@/components/layout";
import { useParams, Link, useLocation } from "wouter";
import {
  useGetBook,
  useGenerateBookPdf,
  useCreateLuluOrder,
  getGetBookQueryKey,
  BookStatus,
  LuluOrderResponse,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Book as BookIcon, Check, ShieldCheck, ArrowLeft, Loader2, FileDown } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { RequireAuth } from "@/components/require-auth";
import { CoverPreview, COVER_TEMPLATES, type CoverTemplateId } from "@/components/cover-designer";

type OrderStep = "form" | "generating-pdf" | "placing-order" | "confirmed";

type PricingTier = {
  maxPages: number | null;
  prices: Record<string, number | undefined>;
};

const DEFAULT_TIERS: PricingTier[] = [
  { maxPages: 20, prices: { simple: 2495, cartoon: 2495, detailed: 2495 } },
  { maxPages: 30, prices: { simple: 2995, cartoon: 2995, detailed: 2995 } },
  { maxPages: 40, prices: { simple: 3495, cartoon: 3495, detailed: 3495 } },
  { maxPages: null, prices: { simple: 4995, cartoon: 4995, detailed: 4995 } },
];

function formatCents(cents: number | undefined): string {
  if (cents === undefined || !Number.isFinite(cents)) return "—";
  return `$${(cents / 100).toFixed(2)}`;
}

function lookupPrice(tiers: PricingTier[], pageCount: number, style: string | undefined): string {
  const sorted = [...tiers].sort((a, b) => {
    if (a.maxPages === null) return 1;
    if (b.maxPages === null) return -1;
    return a.maxPages - b.maxPages;
  });
  const match = sorted.find(t => t.maxPages === null || pageCount <= t.maxPages);
  if (!match) return "—";
  const styleKey = style ?? "simple";
  const cents = match.prices[styleKey] ?? match.prices["simple"];
  return formatCents(cents);
}

export default function Checkout() {
  return (
    <RequireAuth>
      <CheckoutContent />
    </RequireAuth>
  );
}

function CheckoutContent() {
  const { id } = useParams<{ id: string }>();
  const bookId = parseInt(id || "0");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: book, isLoading } = useGetBook(bookId, {
    query: { enabled: !!bookId, queryKey: getGetBookQueryKey(bookId) },
  });
  const { data: settings } = useQuery<{ pricing: PricingTier[] }>({
    queryKey: ["public-settings"],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL ?? ""}/api/settings`);
      if (!res.ok) return { pricing: DEFAULT_TIERS };
      return res.json();
    },
  });
  const pricing = settings?.pricing ?? DEFAULT_TIERS;
  const generatePdf = useGenerateBookPdf();
  const createLuluOrder = useCreateLuluOrder();

  const [orderStep, setOrderStep] = useState<OrderStep>("form");
  const [orderResult, setOrderResult] = useState<LuluOrderResponse | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPreparingPreview, setIsPreparingPreview] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<{ interior: string; cover: string } | null>(null);
  const [shippingLevel, setShippingLevel] = useState<"MAIL" | "GROUND" | "EXPEDITED" | "EXPRESS">("GROUND");
  const [shippingAddress, setShippingAddress] = useState({
    name: "",
    email: "",
    street1: "",
    street2: "",
    city: "",
    state_code: "",
    country_code: "US",
    postcode: "",
    phone_number: "",
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!book) {
    return <Layout><div className="text-center py-20">Book not found</div></Layout>;
  }

  const pageCount = book.pageCount ?? 0;
  const price = lookupPrice(pricing, pageCount, book.style);

  // Tester preview: build the print-ready interior + cover PDFs (the same
  // files that would be sent to Lulu) and surface direct links so we can
  // sanity-check each file BEFORE placing a real print order.
  const handlePreviewDownload = async () => {
    setIsPreparingPreview(true);
    try {
      const result = await generatePdf.mutateAsync({ id: bookId });
      setPreviewUrls({ interior: result.interiorUrl, cover: result.coverUrl });
      toast({
        title: "Print PDFs ready",
        description: "Interior + cover are now available below. These are exactly what would be sent to Lulu.",
      });
    } catch (err) {
      toast({
        title: "PDF preview failed",
        description: (err as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsPreparingPreview(false);
    }
  };

  const handleOrder = async () => {
    const required = ["name", "street1", "city", "country_code", "postcode", "phone_number", "email"] as const;
    const missing = required.filter(f => !shippingAddress[f]?.trim());
    if (missing.length > 0) {
      toast({ title: "Missing shipping info", description: "Please fill all required fields.", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    setOrderStep("generating-pdf");
    try {
      await generatePdf.mutateAsync({ id: bookId });
      setOrderStep("placing-order");

      const result = await createLuluOrder.mutateAsync({
        id: bookId,
        data: {
          contactEmail: shippingAddress.email,
          shippingAddress: {
            name: shippingAddress.name,
            street1: shippingAddress.street1,
            street2: shippingAddress.street2 || undefined,
            city: shippingAddress.city,
            state_code: shippingAddress.state_code || undefined,
            country_code: shippingAddress.country_code,
            postcode: shippingAddress.postcode,
            phone_number: shippingAddress.phone_number,
            email: shippingAddress.email,
          },
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
      setIsProcessing(false);
    }
  };

  if (orderStep === "generating-pdf") {
    return (
      <Layout>
        <div className="animate-in fade-in zoom-in-95 duration-500 text-center py-32">
          <div className="relative w-28 h-28 mx-auto mb-8">
            <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
            <div className="absolute inset-4 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-xl">
              <FileDown className="w-10 h-10 animate-bounce" />
            </div>
          </div>
          <h1 className="text-3xl font-serif font-bold mb-3">Building your book PDF…</h1>
          <p className="text-muted-foreground">Assembling all your coloring pages into a print-ready file.</p>
        </div>
      </Layout>
    );
  }

  if (orderStep === "placing-order") {
    return (
      <Layout>
        <div className="animate-in fade-in zoom-in-95 duration-500 text-center py-32">
          <div className="relative w-28 h-28 mx-auto mb-8">
            <div className="absolute inset-0 bg-accent/20 rounded-full animate-ping" />
            <div className="absolute inset-4 bg-accent text-accent-foreground rounded-full flex items-center justify-center shadow-xl">
              <BookIcon className="w-10 h-10 animate-bounce" />
            </div>
          </div>
          <h1 className="text-3xl font-serif font-bold mb-3">Sending to the printer…</h1>
          <p className="text-muted-foreground">Your order is being placed with our print partner. Hang tight!</p>
        </div>
      </Layout>
    );
  }

  if (orderStep === "confirmed") {
    const arrivalMin = orderResult?.estimatedShipping?.arrival_min;
    const arrivalMax = orderResult?.estimatedShipping?.arrival_max;
    return (
      <Layout>
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto text-center py-20">
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
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 max-w-5xl">
        <Button asChild variant="ghost" className="mb-8 -ml-4">
          <Link href={`/books/${book.id}`}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Book
          </Link>
        </Button>

        <div className="grid lg:grid-cols-5 gap-12">
          {/* Left Col - Product Summary */}
          <div className="lg:col-span-2 space-y-6">
            <h1 className="text-3xl font-serif font-bold">Your Order</h1>
            <div className="bg-card rounded-3xl border border-border p-6 shadow-sm">
              <div className="mx-auto mb-6 w-full max-w-[260px] aspect-[3/4] rounded-xl overflow-hidden shadow-md border border-border/50">
                <CoverPreview
                  template={COVER_TEMPLATES.find(t => t.id === ((book.coverTemplate as CoverTemplateId) || "classic")) ?? COVER_TEMPLATES[0]}
                  title={book.title}
                  subtitle={book.subtitle ?? undefined}
                  tagline={book.coverTagline ?? undefined}
                  coverImagePath={book.coverImagePath}
                />
              </div>
              <h2 className="font-serif text-xl font-bold mb-1">{book.title}</h2>
              <p className="text-sm text-muted-foreground mb-4 capitalize">
                {book.style} Style · {book.pageCount} Pages
              </p>
              <div className="pt-4 border-t border-border space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <BookIcon className="w-4 h-4 text-primary" />
                  8.5×11" premium softcover, printed by Lulu Press
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  100% Satisfaction Guarantee
                </div>
              </div>
            </div>
          </div>

          {/* Right Col - Checkout */}
          <div className="lg:col-span-3 space-y-6">
            <h2 className="text-2xl font-serif font-bold">Shipping Details</h2>

            <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
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
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-1">
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

            <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
              <div className="flex justify-between mb-2 text-muted-foreground text-sm">
                <span>{pageCount} pages</span>
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
                disabled={isProcessing}
                onClick={handleOrder}
              >
                {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : "Place Print Order"}
              </Button>
            </div>

            <div className="bg-muted/40 rounded-2xl border border-dashed border-border p-5">
              <div className="flex items-start gap-3">
                <FileDown className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold mb-1">Tester Mode — Preview Print PDFs</p>
                  <p className="text-xs text-muted-foreground mb-3">
                    Generate the print-ready interior + cover PDFs (using the Lulu cover template) and review them locally. <strong>No order is placed</strong> and Lulu is not contacted.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    disabled={isPreparingPreview || isProcessing}
                    onClick={handlePreviewDownload}
                  >
                    {isPreparingPreview ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Building PDFs…</>
                    ) : (
                      <><FileDown className="w-4 h-4 mr-2" /> {previewUrls ? "Re-generate Test PDFs" : "Generate Test PDFs"}</>
                    )}
                  </Button>

                  {previewUrls && (
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Button
                        asChild
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="rounded-full"
                      >
                        <a href={previewUrls.interior} target="_blank" rel="noopener noreferrer">
                          <BookIcon className="w-4 h-4 mr-2" /> View Interior PDF
                        </a>
                      </Button>
                      <Button
                        asChild
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="rounded-full"
                      >
                        <a href={previewUrls.cover} target="_blank" rel="noopener noreferrer">
                          <FileDown className="w-4 h-4 mr-2" /> View Cover PDF
                        </a>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
