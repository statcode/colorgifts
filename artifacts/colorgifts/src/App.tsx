import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/home";
import CreateBook from "@/pages/create-book";
import BookGallery from "@/pages/book-gallery";
import BookDetail from "@/pages/book-detail";
import BookPreview from "@/pages/book-preview";
import Checkout from "@/pages/checkout";
import Share from "@/pages/share";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/create" component={CreateBook} />
      <Route path="/books" component={BookGallery} />
      <Route path="/books/:id" component={BookDetail} />
      <Route path="/books/:id/preview" component={BookPreview} />
      <Route path="/books/:id/checkout" component={Checkout} />
      <Route path="/books/:id/share" component={Share} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
