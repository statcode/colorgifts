import { Layout } from "@/components/layout";
import { useParams, Link } from "wouter";
import { useGetBook, getGetBookQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getImageUrl } from "@/lib/image-utils";
import { PartyPopper, Copy, Check, Download, ArrowRight, Share2 } from "lucide-react";
import { useState } from "react";

export default function Share() {
  const { id } = useParams<{ id: string }>();
  const bookId = parseInt(id || "0");
  const { data: book } = useGetBook(bookId, { query: { enabled: !!bookId, queryKey: getGetBookQueryKey(bookId) } });

  const [copied, setCopied] = useState(false);

  // Generate a fake share URL for the demo
  const shareUrl = `${window.location.origin}/books/shared/${book?.shareToken || "demo"}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!book) return null;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-16 max-w-3xl text-center">
        <div className="animate-in zoom-in slide-in-from-bottom-8 duration-700">
          <div className="w-24 h-24 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-8 border-4 border-accent/30">
            <PartyPopper className="w-10 h-10 text-accent-foreground" />
          </div>
          
          <h1 className="text-4xl md:text-6xl font-serif font-bold mb-4">You did it!</h1>
          <p className="text-xl text-muted-foreground mb-12">
            Your gift is ready. You just made the world a little more colorful.
          </p>

          <div className="bg-card rounded-[2.5rem] border border-border p-8 md:p-12 shadow-xl relative overflow-hidden text-left mb-12">
            {/* Decorative background element */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-10 translate-x-1/2 -translate-y-1/2"></div>
            
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="w-40 h-52 bg-white rounded-xl shadow-md border border-border/50 shrink-0 overflow-hidden p-2 transform rotate-[-3deg]">
                <div className="w-full h-full border border-black/10 overflow-hidden bg-muted">
                  {book.coverImagePath ? (
                    <img src={getImageUrl(book.coverImagePath)} alt="Cover" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-center p-2">
                      <span className="font-serif font-bold text-sm leading-tight">{book.title}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex-1 w-full text-center md:text-left">
                <h2 className="text-2xl font-serif font-bold mb-2">Share the magic</h2>
                <p className="text-muted-foreground mb-6">Send this digital preview link to grandparents or friends so they can see your creation.</p>
                
                <div className="flex items-center gap-2 mb-4">
                  <Input 
                    readOnly 
                    value={shareUrl} 
                    className="h-12 bg-muted border-transparent font-mono text-xs focus-visible:ring-0"
                  />
                  <Button 
                    onClick={copyToClipboard} 
                    variant={copied ? "default" : "outline"}
                    className={copied ? "bg-secondary text-secondary-foreground" : ""}
                  >
                    {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                    {copied ? "Copied!" : "Copy"}
                  </Button>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button variant="outline" className="rounded-full flex-1">
                    <Download className="w-4 h-4 mr-2" /> Download PDF
                  </Button>
                  <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full flex-1">
                    <Share2 className="w-4 h-4 mr-2" /> Share via Email
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center gap-4">
            <p className="text-muted-foreground">Give $10, Get $10 when a friend orders their first book.</p>
            <Button asChild variant="link" className="text-primary hover:text-primary/80 font-bold">
              <Link href="/books">
                Back to My Gallery <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
