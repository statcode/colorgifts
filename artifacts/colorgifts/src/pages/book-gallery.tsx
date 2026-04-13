import { Layout } from "@/components/layout";
import { useListBooks, getListBooksQueryKey } from "@workspace/api-client-react";
import { BookCard } from "@/components/book-card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { PlusCircle, LibraryBig, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

export default function BookGallery() {
  const { data: books, isLoading, error } = useListBooks();
  const queryClient = useQueryClient();

  // Auto-refresh if any books are generating
  useEffect(() => {
    if (!books) return;
    const hasGenerating = books.some(b => b.status === "generating");
    
    if (hasGenerating) {
      const interval = setInterval(() => {
        queryClient.invalidateQueries({ queryKey: getListBooksQueryKey() });
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [books, queryClient]);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 md:py-20">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-12">
          <div>
            <h1 className="text-4xl font-serif font-bold mb-2">My Gallery</h1>
            <p className="text-muted-foreground text-lg">All your personalized coloring books.</p>
          </div>
          <Button asChild size="lg" className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5">
            <Link href="/create-book">
              <PlusCircle className="w-5 h-5 mr-2" />
              New Book
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-80 bg-muted/50 rounded-2xl animate-pulse"></div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-20 bg-destructive/5 rounded-3xl border border-destructive/20">
            <p className="text-destructive font-medium">Failed to load books. Please try again.</p>
          </div>
        ) : !books || books.length === 0 ? (
          <div className="text-center py-32 bg-muted/30 rounded-[3rem] border border-border border-dashed">
            <div className="w-20 h-20 bg-background rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
              <LibraryBig className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-serif font-bold mb-3">Your gallery is empty</h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              You haven't created any coloring books yet. Start transforming your memories into magic.
            </p>
            <Button asChild size="lg" className="rounded-full h-14 px-8 text-lg bg-primary hover:bg-primary/90 text-primary-foreground">
              <Link href="/create-book">Create Your First Book</Link>
            </Button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {books.map(book => (
              <div key={book.id} className="animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both" style={{ animationDelay: `${book.id * 50}ms` }}>
                <BookCard book={book} />
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
