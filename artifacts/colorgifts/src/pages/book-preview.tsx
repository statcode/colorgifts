import { Layout } from "@/components/layout";
import { useParams, Link } from "wouter";
import { useGetBook, useListBookPages, getGetBookQueryKey, getListBookPagesQueryKey } from "@workspace/api-client-react";
import { getImageUrl } from "@/lib/image-utils";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { RequireAuth } from "@/components/require-auth";

export default function BookPreview() {
  return (
    <RequireAuth>
      <BookPreviewContent />
    </RequireAuth>
  );
}

function BookPreviewContent() {
  const { id } = useParams<{ id: string }>();
  const bookId = parseInt(id || "0");

  const { data: book, isLoading: loadingBook } = useGetBook(bookId, { query: { enabled: !!bookId, queryKey: getGetBookQueryKey(bookId) } });
  const { data: pages, isLoading: loadingPages } = useListBookPages(bookId, { query: { enabled: !!bookId, queryKey: getListBookPagesQueryKey(bookId) } });

  const [currentIndex, setCurrentIndex] = useState(0);

  if (loadingBook || loadingPages) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!book || !pages) return <div>Not found</div>;

  const sortedPages = [...pages].sort((a, b) => a.sortOrder - b.sortOrder);
  const readyPages = sortedPages.filter(p => p.status === "ready");

  const goNext = () => setCurrentIndex(prev => Math.min(prev + 1, readyPages.length - 1));
  const goPrev = () => setCurrentIndex(prev => Math.max(prev - 1, 0));

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col font-sans">
      <header className="bg-background border-b border-border py-4 px-6 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon" className="rounded-full">
            <Link href={`/books/${book.id}`}><ArrowLeft className="w-5 h-5" /></Link>
          </Button>
          <div>
            <h1 className="font-serif font-bold text-lg leading-tight">{book.title}</h1>
            <span className="text-xs text-muted-foreground">Preview Mode</span>
          </div>
        </div>
        <Button asChild className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90">
          <Link href={`/books/${book.id}/checkout`}>Order Now</Link>
        </Button>
      </header>

      <main className="flex-1 min-h-0 flex flex-col items-center justify-center p-3 md:p-6 overflow-hidden relative">

        {readyPages.length === 0 ? (
          <div className="text-center max-w-md">
            <h2 className="text-2xl font-serif font-bold mb-2">No pages ready yet</h2>
            <p className="text-muted-foreground">Please wait for the AI to finish drawing your pages.</p>
          </div>
        ) : (
          <div className="w-full max-w-6xl flex flex-col items-center min-h-0 flex-1">

            {/* The Book View */}
            <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6 w-full flex-1 min-h-0">

              <div className="flex flex-col items-center min-h-0">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Original Photo</span>
                <div className="aspect-[4/5] h-[35vh] md:h-[min(60vh,520px)] bg-card rounded-2xl shadow-md border border-border p-2 md:p-3">
                  <div className="w-full h-full rounded-xl overflow-hidden bg-muted">
                    <img
                      src={getImageUrl(readyPages[currentIndex].originalImagePath)}
                      className="w-full h-full object-cover"
                      alt="Original"
                    />
                  </div>
                </div>
              </div>

              <div className="hidden md:flex items-center justify-center px-1">
                <ArrowRight className="w-8 h-8 text-muted-foreground/30" />
              </div>

              <div className="flex flex-col items-center min-h-0">
                <span className="text-xs font-bold uppercase tracking-wider text-primary mb-2">Coloring Page</span>
                <div className="aspect-[4/5] h-[35vh] md:h-[min(60vh,520px)] bg-white rounded-2xl shadow-xl border border-border p-2 md:p-3 relative before:absolute before:inset-y-0 before:left-0 before:w-6 before:bg-gradient-to-r before:from-black/10 before:to-transparent before:-ml-px">
                  <div className="w-full h-full border border-black/5 overflow-hidden">
                    <img
                      src={`${getImageUrl(readyPages[currentIndex].coloringImagePath)}?watermark=1`}
                      className="w-full h-full object-contain"
                      alt="Line art"
                    />
                  </div>
                </div>
              </div>

            </div>

            {/* Navigation */}
            <div className="mt-4 flex items-center gap-6 bg-background rounded-full p-2 border border-border shadow-sm flex-shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={goPrev}
                disabled={currentIndex === 0}
                className="rounded-full hover:bg-muted"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <span className="text-sm font-medium font-mono w-20 text-center">
                {currentIndex + 1} / {readyPages.length}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={goNext}
                disabled={currentIndex === readyPages.length - 1}
                className="rounded-full hover:bg-muted"
              >
                <ArrowRight className="w-5 h-5" />
              </Button>
            </div>

            {/* Thumbnails */}
            <div className="mt-3 flex gap-2 overflow-x-auto w-full max-w-3xl pb-2 px-4 custom-scrollbar justify-center flex-shrink-0">
              {readyPages.map((page, idx) => (
                <button
                  key={page.id}
                  onClick={() => setCurrentIndex(idx)}
                  className={cn(
                    "relative h-14 w-11 shrink-0 rounded overflow-hidden border-2 transition-all",
                    currentIndex === idx ? "border-primary scale-110 shadow-md z-10" : "border-transparent opacity-60 hover:opacity-100"
                  )}
                >
                  <img src={`${getImageUrl(page.coloringImagePath)}?watermark=1`} className="w-full h-full object-cover bg-white" alt={`Thumb ${idx}`} />
                </button>
              ))}
            </div>

          </div>
        )}
      </main>
    </div>
  );
}
