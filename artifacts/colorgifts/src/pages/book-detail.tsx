import { Layout } from "@/components/layout";
import { cn } from "@/lib/utils";
import { useParams, Link } from "wouter";
import {
  useGetBook,
  useListBookPages,
  useDeletePage,
  useRegeneratePage,
  useUpdateBook,
  useUpdatePage,
  useDeleteBook,
  useRequestUploadUrl,
  useCreatePhoto,
  useGenerateBookPages,
  getGetBookQueryKey,
  getListBookPagesQueryKey
} from "@workspace/api-client-react";
import type { ColoringPage } from "@workspace/api-client-react";
import { StatusBadge } from "@/components/status-badge";
import { getImageUrl } from "@/lib/image-utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useState, useEffect, useRef, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, RefreshCw, Trash2, ArrowLeft, PenSquare, Eye, ShoppingCart, Loader2, AlertCircle, GripVertical, Type, ImageIcon, UploadCloud, X, Plus, Info } from "lucide-react";
import { ColoringPageStatus } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { RequireAuth } from "@/components/require-auth";
import { CoverDesigner, type CoverTemplateId } from "@/components/cover-designer";
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

type EditorPage = ColoringPage & { caption: string };

function SortablePageRow({
  page,
  index,
  isOnCover,
  onToggleCover,
  onCaptionChange,
  onRegenerate,
  onDelete,
}: {
  page: EditorPage;
  index: number;
  isOnCover: boolean;
  onToggleCover: (page: EditorPage) => void;
  onCaptionChange: (id: number, caption: string) => void;
  onRegenerate: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: page.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  const isBusy = page.status === ColoringPageStatus.pending || page.status === ColoringPageStatus.generating;

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
        aria-label="Drag to reorder"
      >
        <GripVertical className="w-5 h-5" />
      </button>

      <div className="w-14 h-14 rounded-xl overflow-hidden bg-muted border border-border flex-shrink-0">
        {page.status === ColoringPageStatus.ready && page.coloringImagePath ? (
          <img src={`${getImageUrl(page.coloringImagePath)}?watermark=1`} alt={`Page ${index + 1}`} className="w-full h-full object-cover" />
        ) : page.status === ColoringPageStatus.failed ? (
          <div className="w-full h-full flex items-center justify-center">
            <AlertCircle className="w-5 h-5 text-destructive" />
          </div>
        ) : isBusy ? (
          <div className="w-full h-full flex items-center justify-center">
            <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
          </div>
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

      <label
        className={cn(
          "flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border cursor-pointer transition-colors flex-shrink-0",
          isOnCover
            ? "border-primary bg-primary/10 text-primary"
            : "border-border bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted",
          (!page.coloringImagePath || page.status !== ColoringPageStatus.ready) && "opacity-50 cursor-not-allowed"
        )}
        title="Use this image as the cover"
      >
        <input
          type="checkbox"
          className="accent-primary"
          checked={isOnCover}
          disabled={!page.coloringImagePath || page.status !== ColoringPageStatus.ready}
          onChange={() => onToggleCover(page)}
        />
        Put on cover
      </label>

      <div className="flex gap-1 flex-shrink-0">
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => onRegenerate(page.id)} title="Regenerate">
          <RefreshCw className={cn("w-4 h-4", isBusy && "animate-spin")} />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => onDelete(page.id)} title="Delete">
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

export default function BookDetail() {
  return (
    <RequireAuth>
      <BookDetailContent />
    </RequireAuth>
  );
}

function BookDetailContent() {
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
  const updatePage = useUpdatePage();
  const requestUploadUrl = useRequestUploadUrl();
  const createPhoto = useCreatePhoto();
  const generatePages = useGenerateBookPages();

  const addMoreInputRef = useRef<HTMLInputElement>(null);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [isUploadingMore, setIsUploadingMore] = useState(false);
  const [uploadMoreProgress, setUploadMoreProgress] = useState(0);

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDedication, setEditDedication] = useState("");

  const initializedForId = useRef<number | null>(null);

  const [editorPages, setEditorPages] = useState<EditorPage[]>([]);

  const [coverTemplate, setCoverTemplate] = useState<CoverTemplateId>("classic");
  const [coverTitle, setCoverTitle] = useState("");
  const [coverSubtitle, setCoverSubtitle] = useState("");
  const [coverTagline, setCoverTagline] = useState("");
  const [coverImagePath, setCoverImagePath] = useState<string | null>(null);
  const coverInitializedForId = useRef<number | null>(null);

  const dndSensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Sync editorPages with server pages:
  // - on initial load, sort by server sortOrder
  // - on refetch (e.g., after regenerate), keep user's current draft order + captions,
  //   drop deleted pages, append any newly-added ones
  useEffect(() => {
    if (!pages) return;
    setEditorPages(prev => {
      const merged = pages.map(serverPage => {
        const draft = prev.find(p => p.id === serverPage.id);
        return {
          ...serverPage,
          caption: draft ? draft.caption : (serverPage.caption ?? ""),
        };
      });
      if (prev.length === 0) {
        return merged.slice().sort((a, b) => a.sortOrder - b.sortOrder);
      }
      const prevOrder = prev.map(p => p.id);
      const kept = prevOrder
        .map(id => merged.find(m => m.id === id))
        .filter((m): m is EditorPage => !!m);
      const added = merged.filter(m => !prevOrder.includes(m.id));
      return [...kept, ...added];
    });
  }, [pages]);

  // Init cover fields from book on first load (per book id)
  useEffect(() => {
    if (!book) return;
    if (coverInitializedForId.current === book.id) return;
    coverInitializedForId.current = book.id;
    setCoverTemplate((book.coverTemplate as CoverTemplateId) || "classic");
    setCoverTitle(book.title || "");
    setCoverSubtitle(book.subtitle || "");
    setCoverTagline(book.coverTagline || "");
    setCoverImagePath(book.coverImagePath || null);
  }, [book]);

  const pagesDirty = useMemo(() => {
    if (!pages || editorPages.length === 0) return false;
    const serverById = new Map(pages.map(p => [p.id, p]));
    return editorPages.some((p, idx) => {
      const s = serverById.get(p.id);
      if (!s) return false;
      return s.sortOrder !== idx || (s.caption ?? "") !== p.caption;
    });
  }, [pages, editorPages]);

  const coverDirty = useMemo(() => {
    if (!book) return false;
    return (
      (book.coverTemplate || "classic") !== coverTemplate ||
      (book.title || "") !== coverTitle ||
      (book.subtitle || "") !== coverSubtitle ||
      (book.coverTagline || "") !== coverTagline ||
      (book.coverImagePath || null) !== (coverImagePath || null)
    );
  }, [book, coverTemplate, coverTitle, coverSubtitle, coverTagline, coverImagePath]);

  const handleToggleCover = (page: EditorPage) => {
    if (!page.coloringImagePath) return;
    setCoverImagePath(prev => prev === page.coloringImagePath ? null : page.coloringImagePath ?? null);
  };

  const isDirty = pagesDirty || coverDirty;

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setEditorPages(prev => {
        const oldIdx = prev.findIndex(p => p.id === active.id);
        const newIdx = prev.findIndex(p => p.id === over.id);
        return arrayMove(prev, oldIdx, newIdx);
      });
    }
  };

  const handleCaptionChange = (id: number, caption: string) => {
    setEditorPages(prev => prev.map(p => p.id === id ? { ...p, caption } : p));
  };

  const handleSaveArrangement = async () => {
    if (!pages) return;
    const serverById = new Map(pages.map(p => [p.id, p]));
    const changed = editorPages
      .map((page, idx) => {
        const server = serverById.get(page.id);
        if (!server) return null;
        const sortOrderChanged = server.sortOrder !== idx;
        const captionChanged = (server.caption ?? "") !== page.caption;
        if (!sortOrderChanged && !captionChanged) return null;
        return { id: page.id, sortOrder: idx, caption: page.caption };
      })
      .filter((u): u is { id: number; sortOrder: number; caption: string } => !!u);

    const tasks: Promise<unknown>[] = [];
    for (const u of changed) {
      tasks.push(
        updatePage.mutateAsync({ id: u.id, data: { sortOrder: u.sortOrder, caption: u.caption || null } })
      );
    }
    if (coverDirty) {
      tasks.push(
        updateBook.mutateAsync({
          id: bookId,
          data: {
            title: coverTitle || undefined,
            subtitle: coverSubtitle || null,
            coverTemplate: coverTemplate as any,
            coverTagline: coverTagline || null,
            coverImagePath: coverImagePath ?? null,
          },
        })
      );
    }
    if (tasks.length === 0) return;

    try {
      await Promise.all(tasks);
      if (coverDirty) queryClient.invalidateQueries({ queryKey: getGetBookQueryKey(bookId) });
      if (changed.length > 0) queryClient.invalidateQueries({ queryKey: getListBookPagesQueryKey(bookId) });
      toast({ title: "Changes saved" });
    } catch (error) {
      toast({ title: "Failed to save", variant: "destructive" });
    }
  };

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
      setEditorPages(prev => prev.filter(p => p.id !== pageId));
      queryClient.invalidateQueries({ queryKey: getListBookPagesQueryKey(bookId) });
      toast({ title: "Page deleted" });
    } catch (error) {
      toast({ title: "Failed to delete page", variant: "destructive" });
    }
  };

  const handleNewFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const picked = Array.from(e.target.files).filter(f => f.type.startsWith("image/"));
      setNewFiles(prev => [...prev, ...picked]);
    }
    if (addMoreInputRef.current) addMoreInputRef.current.value = "";
  };

  const handleNewFilesDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const picked = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/"));
      setNewFiles(prev => [...prev, ...picked]);
    }
  };

  const removeNewFile = (idx: number) => {
    setNewFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const handleAddMorePages = async () => {
    if (!bookId || newFiles.length === 0) return;
    setIsUploadingMore(true);
    setUploadMoreProgress(0);
    try {
      for (let i = 0; i < newFiles.length; i++) {
        const file = newFiles[i];
        const { uploadURL, objectPath } = await requestUploadUrl.mutateAsync({
          data: { name: file.name, size: file.size, contentType: file.type },
        });
        await fetch(uploadURL, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });
        await createPhoto.mutateAsync({
          data: { bookId, objectPath, fileName: file.name },
        });
        setUploadMoreProgress(Math.round(((i + 1) / newFiles.length) * 100));
      }
      await generatePages.mutateAsync({ id: bookId });
      setNewFiles([]);
      queryClient.invalidateQueries({ queryKey: getGetBookQueryKey(bookId) });
      queryClient.invalidateQueries({ queryKey: getListBookPagesQueryKey(bookId) });
      toast({ title: "New pages queued", description: "Generation has started for the new photos." });
    } catch (error) {
      toast({ title: "Upload failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setIsUploadingMore(false);
      setUploadMoreProgress(0);
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

      <div className="container mx-auto px-4 py-12 max-w-4xl space-y-10">
        <div className="flex items-start gap-3 rounded-2xl border border-amber-300/50 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          <Info className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          <div>
            <p className="font-semibold">Watermarks are only shown in preview.</p>
            <p className="text-amber-800/90 dark:text-amber-300/90">
              The "COLORGIFTS" watermark appears on cover and page previews while you're designing. When you place an order, your printed book will contain the <strong>full, watermark-free coloring pages</strong>.
            </p>
          </div>
        </div>

        <CoverDesigner
          template={coverTemplate}
          onTemplateChange={setCoverTemplate}
          title={coverTitle}
          onTitleChange={setCoverTitle}
          subtitle={coverSubtitle}
          onSubtitleChange={setCoverSubtitle}
          tagline={coverTagline}
          onTaglineChange={setCoverTagline}
          coverImagePath={coverImagePath}
        />

        <div className="border-t border-border" />

        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-serif font-bold">Arrange Your Pages</h2>
              <p className="text-sm text-muted-foreground">Drag to reorder, and add an optional caption beneath each illustration.</p>
            </div>
          </div>
          {book.status === "generating" && (
            <p className="text-sm text-muted-foreground animate-pulse flex items-center shrink-0">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              AI is drawing your pages...
            </p>
          )}
        </div>

        {editorPages.length === 0 ? (
          <div className="text-center py-20 bg-muted/20 rounded-3xl border border-dashed border-border">
            <p className="text-muted-foreground">No pages found.</p>
          </div>
        ) : (
          <>
            <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={editorPages.map(p => p.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-3">
                  {editorPages.map((page, idx) => (
                    <SortablePageRow
                      key={page.id}
                      page={page}
                      index={idx}
                      isOnCover={!!coverImagePath && coverImagePath === page.coloringImagePath}
                      onToggleCover={handleToggleCover}
                      onCaptionChange={handleCaptionChange}
                      onRegenerate={handleRegeneratePage}
                      onDelete={handleDeletePage}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            <div className="flex justify-end pt-6">
              <Button
                size="lg"
                className="rounded-full h-12 px-8 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md"
                onClick={handleSaveArrangement}
                disabled={!isDirty || updatePage.isPending || updateBook.isPending}
              >
                {(updatePage.isPending || updateBook.isPending) ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                Save Changes
              </Button>
            </div>
          </>
        )}

        <div className="border-t border-border" />

        <div>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Plus className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-serif font-bold">Add More Pages</h2>
              <p className="text-sm text-muted-foreground">Upload additional photos — each becomes a new coloring page in this book.</p>
            </div>
          </div>

          <input
            type="file"
            ref={addMoreInputRef}
            className="hidden"
            multiple
            accept="image/jpeg,image/png,image/webp"
            onChange={handleNewFilesSelected}
          />

          <div
            className="border-2 border-dashed border-border rounded-3xl flex flex-col items-center justify-center text-center bg-muted/10 hover:bg-muted/30 transition-colors cursor-pointer group py-10"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleNewFilesDrop}
            onClick={() => addMoreInputRef.current?.click()}
          >
            <div className="w-14 h-14 bg-background rounded-full flex items-center justify-center mb-4 shadow-sm group-hover:scale-110 transition-transform">
              <UploadCloud className="w-7 h-7 text-primary" />
            </div>
            <h3 className="text-lg font-serif font-bold mb-1">Drag & drop photos here</h3>
            <p className="text-muted-foreground text-sm mb-4">JPG, PNG or WebP</p>
            <Button
              type="button"
              size="sm"
              className="rounded-full px-6"
              onClick={(e) => { e.stopPropagation(); addMoreInputRef.current?.click(); }}
            >
              Choose files
            </Button>
          </div>

          {newFiles.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold text-base">
                  {newFiles.length} {newFiles.length === 1 ? "photo" : "photos"} ready to add
                </h4>
                <Button variant="ghost" size="sm" onClick={() => setNewFiles([])} className="text-muted-foreground hover:text-destructive text-sm" disabled={isUploadingMore}>
                  Clear
                </Button>
              </div>
              <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 mb-5">
                {newFiles.map((file, i) => (
                  <div key={i} className="relative group aspect-square rounded-xl overflow-hidden border border-border shadow-sm">
                    <img src={URL.createObjectURL(file)} alt="upload preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button
                        variant="destructive"
                        size="icon"
                        className="rounded-full w-7 h-7"
                        onClick={(e) => { e.stopPropagation(); removeNewFile(i); }}
                        disabled={isUploadingMore}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end">
                <Button
                  size="lg"
                  className="rounded-full h-12 px-8 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md"
                  onClick={handleAddMorePages}
                  disabled={isUploadingMore}
                >
                  {isUploadingMore ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      Uploading… {uploadMoreProgress}%
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 mr-2" />
                      Add {newFiles.length} {newFiles.length === 1 ? "Page" : "Pages"}
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
