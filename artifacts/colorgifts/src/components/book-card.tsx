import { Link } from "wouter";
import { Book } from "@workspace/api-client-react";
import { getImageUrl } from "@/lib/image-utils";
import { StatusBadge } from "./status-badge";
import { format } from "date-fns";
import { Card, CardContent } from "./ui/card";
import { Gift, Image as ImageIcon } from "lucide-react";

interface BookCardProps {
  book: Book;
}

export function BookCard({ book }: BookCardProps) {
  const baseCoverUrl = getImageUrl(book.coverImagePath);
  const coverUrl = baseCoverUrl ? `${baseCoverUrl}?watermark=1` : null;

  return (
    <Link href={`/books/${book.id}`}>
      <Card className="group overflow-hidden border-border bg-card hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer h-full flex flex-col rounded-2xl">
        <div className="relative aspect-[4/3] bg-muted overflow-hidden">
          {coverUrl ? (
            <img 
              src={coverUrl} 
              alt={book.title} 
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground/50 bg-secondary/10 group-hover:bg-secondary/20 transition-colors">
              <Gift className="w-12 h-12" />
            </div>
          )}
          <div className="absolute top-3 right-3">
            <StatusBadge status={book.status} className="shadow-sm backdrop-blur-sm bg-background/90" />
          </div>
          <div className="absolute bottom-3 left-3 bg-background/90 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-medium flex items-center gap-1.5 shadow-sm text-foreground">
            <ImageIcon className="w-3.5 h-3.5" />
            {book.pageCount} pages
          </div>
        </div>
        <CardContent className="p-5 flex-1 flex flex-col">
          <h3 className="font-serif text-xl font-bold line-clamp-1 mb-1 text-card-foreground group-hover:text-primary transition-colors">
            {book.title}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2 flex-1">
            {book.dedication || "No dedication"}
          </p>
          <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
            <span className="capitalize">{book.style} Style</span>
            <span>{format(new Date(book.createdAt), "MMM d, yyyy")}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
