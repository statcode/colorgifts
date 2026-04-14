import { Layout } from "@/components/layout";
import { cn } from "@/lib/utils";
import { useParams, Link } from "wouter";
import { 
  useGetBook, 
  useListBookPages, 
  useDeletePage, 
  useRegeneratePage, 
  useUpdateBook,
  useDeleteBook,
  getGetBookQueryKey,
  getListBookPagesQueryKey
} from "@workspace/api-client-react";
import { StatusBadge } from "@/components/status-badge";
import { getImageUrl } from "@/lib/image-utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, RefreshCw, Trash2, ArrowLeft, PenSquare, Eye, ShoppingCart, Loader2, AlertCircle } from "lucide-react";
import { ColoringPageStatus } from "@workspace/api-client-react";
import { useLocation } from "wouter";

export default function BookDetail() {
  const { id } = useParams<{ id: string }>();
  const bookId = parseInt(id || "0");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: book, isLoading: loadingBook } = useGetBook(bookId, { query: { enabled: !!bookId, queryKey: getGetBookQueryKey(bookId) } });
  const { data: pages, isLoading: loadingPages } = useListBookPages(bookId, { query: { enabled: !!bookId, queryKey: getListBookPagesQueryKey(bookId) } });
  
  const updateBook = useUpdateBook();
  const deleteBook = useDeleteBook();
  const deletePage = useDeletePage();
  const regeneratePage = useRegeneratePage();

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDedication, setEditDedication] = useState("");

  const initializedForId = useRef<number | null>(null);

  // Auto-refresh logic if book or pages are generating
  useEffect(() => {
    if (!book || !pages) return;
    
    const isBookGenerating = book.status === "generating";
    const hasGeneratingPages = pages.some(p => p.status === "generating" || p.status === "pending");
    
    if (isBookGenerating || hasGeneratingPages) {
      const interval = setInterval(() => {
        queryClient.invalidateQueries({ queryKey: getGetBookQueryKey(bookId) });
        queryClient.invalidateQueries({ queryKey: getListBookPagesQueryKey(bookId) });
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [book, pages, bookId, queryClient]);

  // Init edit state safely
  useEffect(() => {
    if (book && initializedForId.current !== book.id) {
      initializedForId.current = book.id;
      setEditTitle(book.title);
      setEditDedication(book.dedication || "");
    }
  }, [book]);

  const handleSaveDetails = async () => {
    try {
      await updateBook.mutateAsync({
        id: bookId,
        data: {
          title: editTitle,
          dedication: editDedication || null
        }
      });
      setIsEditing(false);
      queryClient.setQueryData(getGetBookQueryKey(bookId), (old: any) => 
        old ? { ...old, title: editTitle, dedication: editDedication || null } : old
      );
      toast({ title: "Book details updated" });
    } catch (error) {
      toast({ title: "Failed to update", variant: "destructive" });
    }
  };

  const handleDeletePage = async (pageId: number) => {
    if (!confirm("Are you sure you want to delete this page?")) return;
    try {
      await deletePage.mutateAsync({ id: pageId });
      queryClient.invalidateQueries({ queryKey: getListBookPagesQueryKey(bookId) });
      toast({ title: "Page deleted" });
    } catch (error) {
      toast({ title: "Failed to delete page", variant: "destructive" });
    }
  };

  const handleRegeneratePage = async (pageId: number) => {
    try {
      await regeneratePage.mutateAsync({ id: pageId });
      queryClient.invalidateQueries({ queryKey: getListBookPagesQueryKey(bookId) });
      toast({ title: "Regeneration started" });
    } catch (error) {
      toast({ title: "Failed to restart generation", variant: "destructive" });
    }
  };

  if (loadingBook || loadingPages) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 flex justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!book) {
    return <Layout><div className="text-center py-20">Book not found</div></Layout>;
  }

  return (
    <Layout>
      <div className="bg-muted/30 border-b border-border pt-10 pb-12">
        <div className="container mx-auto px-4 max-w-6xl">
          <Button asChild variant="ghost" className="mb-6 -ml-4 text-muted-foreground hover:text-foreground">
            <Link href="/books"><ArrowLeft className="w-4 h-4 mr-2" /> Back to Gallery</Link>
          </Button>

          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <StatusBadge status={book.status} />
                <span className="text-sm text-muted-foreground capitalize font-medium px-2.5 py-1 rounded-full bg-background border border-border">
                  {book.style} Style
                </span>
              </div>
              
              <div className="flex items-center gap-4 mt-4">
                <h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground">{book.title}</h1>
                <Dialog open={isEditing} onOpenChange={setIsEditing}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full hover:bg-background">
                      <PenSquare className="w-5 h-5" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px] rounded-3xl">
                    <DialogHeader>
                      <DialogTitle className="font-serif text-2xl">Edit Details</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-6 py-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium font-serif">Title</label>
                        <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="h-12 rounded-xl bg-muted/50 border-transparent focus-visible:bg-background" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium font-serif">Dedication</label>
                        <textarea 
                          value={editDedication} 
                          onChange={(e) => setEditDedication(e.target.value)} 
                          className="flex min-h-[100px] w-full rounded-xl border border-transparent bg-muted/50 px-3 py-3 text-sm focus-visible:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleSaveDetails} className="rounded-full bg-primary hover:bg-primary/90">Save Changes</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              
              {book.subtitle && <p className="text-xl text-muted-foreground mt-2 font-serif italic">{book.subtitle}</p>}
              
              {book.dedication && (
                <div className="mt-6 p-4 bg-background rounded-2xl border border-border max-w-2xl relative">
                  <div className="absolute top-4 right-4 text-4xl text-muted/30 font-serif leading-none">"</div>
                  <p className="text-muted-foreground italic leading-relaxed relative z-10">{book.dedication}</p>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 md:shrink-0 pt-2">
              <Button asChild variant="outline" size="lg" className="rounded-full h-14 px-6 bg-background border-2 hover:bg-muted/50">
                <Link href={`/books/${book.id}/preview`}>
                  <Eye className="w-5 h-5 mr-2" />
                  Full Preview
                </Link>
              </Button>
              <Button asChild size="lg" className="rounded-full h-14 px-8 text-lg bg-accent text-accent-foreground hover:bg-accent/90 shadow-md hover:shadow-lg transition-all" disabled={book.status !== "ready"}>
                <Link href={`/books/${book.id}/checkout`} className={book.status !== "ready" ? "pointer-events-none opacity-50" : ""}>
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  Order Gift
                </Link>
              </Button>
              <Button variant="outline" size="icon" className="rounded-full h-14 w-14 border-2 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30" onClick={async () => {
                if(confirm("Are you sure you want to delete this book? This action cannot be undone.")) {
                  try {
                    await deleteBook.mutateAsync({ id: bookId });
                    toast({ title: "Book deleted" });
                    setLocation("/books");
                  } catch (e) {
                    toast({ title: "Failed to delete book", variant: "destructive" });
                  }
                }
              }}>
                <Trash2 className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 max-w-6xl">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-serif font-bold flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-primary" />
            Book Pages ({pages?.length || 0})
          </h2>
          {book.status === "generating" && (
            <p className="text-sm text-muted-foreground animate-pulse flex items-center">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              AI is drawing your pages...
            </p>
          )}
        </div>

        {!pages || pages.length === 0 ? (
          <div className="text-center py-20 bg-muted/20 rounded-3xl border border-dashed border-border">
            <p className="text-muted-foreground">No pages found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {pages.sort((a, b) => a.sortOrder - b.sortOrder).map((page, index) => (
              <div key={page.id} className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm group">
                <div className="p-3 bg-muted/30 border-b border-border flex items-center justify-between">
                  <span className="text-xs font-bold text-muted-foreground font-mono">PAGE {index + 1}</span>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => handleRegeneratePage(page.id)} title="Regenerate">
                      <RefreshCw className={cn("w-3.5 h-3.5", (page.status === 'pending' || page.status === 'generating') && "animate-spin")} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleDeletePage(page.id)} title="Delete">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                
                <div className="relative aspect-square bg-muted flex items-center justify-center overflow-hidden">
                  {page.status === ColoringPageStatus.ready && page.coloringImagePath ? (
                    <img 
                      src={getImageUrl(page.coloringImagePath)} 
                      alt={`Page ${index + 1}`} 
                      className="w-full h-full object-contain bg-white"
                    />
                  ) : page.status === ColoringPageStatus.failed ? (
                    <div className="text-center p-4">
                      <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-2" />
                      <p className="text-xs text-destructive">Failed to generate</p>
                    </div>
                  ) : (
                    <div className="text-center p-4">
                      <div className="relative w-12 h-12 mx-auto mb-3">
                        <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                      </div>
                      <p className="text-xs font-medium text-muted-foreground animate-pulse">Drawing...</p>
                    </div>
                  )}

                  {/* Hover reveal original photo */}
                  <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center p-4 text-white">
                    <span className="text-xs font-medium uppercase tracking-wider mb-2 opacity-80">Original Photo</span>
                    <img 
                      src={getImageUrl(page.originalImagePath)} 
                      alt="Original" 
                      className="w-full h-full max-w-[80%] max-h-[80%] object-contain rounded border border-white/20"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
