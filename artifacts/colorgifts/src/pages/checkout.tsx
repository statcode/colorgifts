import { Layout } from "@/components/layout";
import { useParams, Link, useLocation } from "wouter";
import { useGetBook, useUpdateBook, getGetBookQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { getImageUrl } from "@/lib/image-utils";
import { FileDown, Book as BookIcon, Check, ShieldCheck, ArrowLeft, Loader2 } from "lucide-react";
import { BookStatus } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

export default function Checkout() {
  const { id } = useParams<{ id: string }>();
  const bookId = parseInt(id || "0");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: book, isLoading } = useGetBook(bookId, { query: { enabled: !!bookId, queryKey: getGetBookQueryKey(bookId) } });
  const updateBook = useUpdateBook();

  const [selectedFormat, setSelectedFormat] = useState<"digital" | "print" | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  if (isLoading) return <Layout><div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin" /></div></Layout>;
  if (!book) return <Layout><div className="text-center py-20">Book not found</div></Layout>;

  const handleCheckout = async () => {
    if (!selectedFormat) return;
    setIsProcessing(true);

    try {
      // Simulate payment processing
      await new Promise(r => setTimeout(r, 1500));

      await updateBook.mutateAsync({
        id: bookId,
        data: { status: BookStatus.ordered }
      });
      
      queryClient.setQueryData(getGetBookQueryKey(bookId), (old: any) => 
        old ? { ...old, status: BookStatus.ordered } : old
      );

      toast({
        title: "Order confirmed!",
        description: "Your gift is on its way."
      });

      setLocation(`/books/${book.id}/share`);
    } catch (error) {
      toast({ title: "Checkout failed", variant: "destructive" });
      setIsProcessing(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 max-w-5xl">
        <Button asChild variant="ghost" className="mb-8 -ml-4">
          <Link href={`/books/${book.id}`}><ArrowLeft className="w-4 h-4 mr-2" /> Back to Book</Link>
        </Button>

        <div className="grid lg:grid-cols-5 gap-12">
          
          {/* Left Col - Product Summary */}
          <div className="lg:col-span-2 space-y-6">
            <h1 className="text-3xl font-serif font-bold">Your Order</h1>
            <div className="bg-card rounded-3xl border border-border p-6 shadow-sm">
              <div className="aspect-[4/3] bg-muted rounded-xl mb-6 overflow-hidden border border-border/50">
                {book.coverImagePath ? (
                  <img src={getImageUrl(book.coverImagePath)} alt="Cover" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-white">
                    <span className="font-serif text-2xl font-bold mb-2">{book.title}</span>
                    <span className="text-sm text-muted-foreground">{book.pageCount} coloring pages</span>
                  </div>
                )}
              </div>
              <h2 className="font-serif text-xl font-bold mb-1">{book.title}</h2>
              <p className="text-sm text-muted-foreground mb-4 capitalize">{book.style} Style • {book.pageCount} Pages</p>
              
              <div className="pt-4 border-t border-border">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <ShieldCheck className="w-4 h-4 text-primary" /> 100% Satisfaction Guarantee
                </div>
              </div>
            </div>
          </div>

          {/* Right Col - Formats */}
          <div className="lg:col-span-3">
            <h2 className="text-2xl font-serif font-bold mb-6">Choose Format</h2>
            
            <div className="space-y-4 mb-8">
              {/* Digital Option */}
              <label 
                className={`flex items-start p-6 rounded-2xl border-2 cursor-pointer transition-all ${
                  selectedFormat === 'digital' ? 'border-primary bg-primary/5 shadow-md' : 'border-border hover:border-primary/50 hover:bg-muted/30 bg-card'
                }`}
              >
                <div className="flex items-center h-6 mr-4">
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${selectedFormat === 'digital' ? 'border-primary bg-primary' : 'border-input'}`}>
                    {selectedFormat === 'digital' && <Check className="w-3 h-3 text-primary-foreground" />}
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
                    Instant download. High resolution PDF ready to print at home as many times as you want. Perfect for immediate gifting.
                  </p>
                </div>
              </label>

              {/* Print Option */}
              <label 
                className={`flex items-start p-6 rounded-2xl border-2 cursor-pointer transition-all relative overflow-hidden ${
                  selectedFormat === 'print' ? 'border-accent bg-accent/5 shadow-md' : 'border-border hover:border-accent/50 hover:bg-muted/30 bg-card'
                }`}
              >
                {selectedFormat === 'print' && <div className="absolute top-0 right-0 bg-accent text-accent-foreground text-xs font-bold px-3 py-1 rounded-bl-lg">POPULAR</div>}
                <div className="flex items-center h-6 mr-4">
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${selectedFormat === 'print' ? 'border-accent bg-accent' : 'border-input'}`}>
                    {selectedFormat === 'print' && <Check className="w-3 h-3 text-accent-foreground" />}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                      <BookIcon className="w-5 h-5 text-muted-foreground" /> Premium Printed Book
                    </h3>
                    <span className="font-bold text-lg">$19.99</span>
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-3">
                    Beautifully bound softcover book on thick, bleed-resistant paper. Ships free worldwide in 3-5 days. Includes digital PDF.
                  </p>
                  {selectedFormat === 'print' && (
                    <div className="animate-in slide-in-from-top-2 fade-in duration-300 pt-4 border-t border-border/50">
                      <p className="text-xs font-medium text-primary mb-2">Estimated delivery: {new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString()}</p>
                    </div>
                  )}
                </div>
              </label>
            </div>

            <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
              <div className="flex justify-between mb-2 text-muted-foreground">
                <span>Subtotal</span>
                <span>{selectedFormat === 'print' ? '$19.99' : selectedFormat === 'digital' ? '$9.99' : '$0.00'}</span>
              </div>
              <div className="flex justify-between mb-4 text-muted-foreground">
                <span>Shipping</span>
                <span>{selectedFormat === 'print' ? 'Free' : '-'}</span>
              </div>
              <div className="flex justify-between pt-4 border-t border-border font-bold text-xl mb-6">
                <span>Total</span>
                <span>{selectedFormat === 'print' ? '$19.99' : selectedFormat === 'digital' ? '$9.99' : '$0.00'}</span>
              </div>

              <Button 
                className="w-full h-14 rounded-full text-lg shadow-lg" 
                size="lg" 
                disabled={!selectedFormat || isProcessing}
                onClick={handleCheckout}
                style={{ backgroundColor: selectedFormat === 'print' ? 'hsl(var(--accent))' : 'hsl(var(--primary))', color: selectedFormat === 'print' ? 'hsl(var(--accent-foreground))' : 'hsl(var(--primary-foreground))' }}
              >
                {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : `Pay ${selectedFormat === 'print' ? '$19.99' : selectedFormat === 'digital' ? '$9.99' : ''}`}
              </Button>
            </div>
          </div>

        </div>
      </div>
    </Layout>
  );
}
