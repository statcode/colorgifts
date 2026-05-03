import { Layout } from "@/components/layout";
import { SEO } from "@/components/seo";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, Heart, Wand2, ArrowRight, ImageIcon, Gift, Users, Dog, Baby, Sunset, ChevronRight, Camera, BookOpen } from "lucide-react";
import heroStep1 from "@/assets/hero-step1-photos.png";
import heroStep2 from "@/assets/hero-step2-coloring.png";
import heroStep3 from "@/assets/hero-step3-book.png";
import simpleStyleImg from "@/assets/style-simple.png";
import cartoonStyleImg from "@/assets/style-cartoon.png";
import detailedStyleImg from "@/assets/style-detailed.png";

const STYLE_CARDS = [
  {
    id: "simple",
    name: "Simple",
    img: simpleStyleImg,
    desc: "Thick, bold outlines with minimal detail. Great for young children and anyone who prefers a relaxing, easy coloring experience.",
  },
  {
    id: "cartoon",
    name: "Cartoon",
    img: cartoonStyleImg,
    desc: "Expressive, warm, and full of character. Perfect for families, pet portraits, and anyone who wants a touch of whimsy.",
  },
  {
    id: "detailed",
    name: "Detailed",
    img: detailedStyleImg,
    desc: "Intricate lines and rich texture. Ideal for adults, mindful coloring, and anyone who loves the meditative quality of fine detail.",
  },
];

export default function Home() {
  const { data: publicSettings } = useQuery<{ enabledStyles: string[] }>({
    queryKey: ["public-settings"],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL ?? ""}/api/settings`);
      if (!res.ok) return { enabledStyles: ["simple", "cartoon"] };
      return res.json();
    },
  });
  const enabledStyleIds = publicSettings?.enabledStyles ?? ["simple", "cartoon"];
  const visibleStyles = STYLE_CARDS.filter(s => enabledStyleIds.includes(s.id));

  return (
    <Layout>
      <SEO 
        title="Turn Memories into Personalized Coloring Books" 
        description="Upload your favorite photos and transform them into personalized coloring books. The perfect heartfelt gift for anyone — kids, adults, grandparents, pet lovers, and couples."
      />
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-24 lg:pt-24 lg:pb-32">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-background to-background"></div>
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid lg:grid-cols-[45%_55%] gap-12 lg:gap-6 items-center">
            <div className="max-w-2xl animate-in fade-in slide-in-from-bottom-8 duration-1000">
              <div className="flex flex-wrap items-center gap-2 mb-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/20 text-accent-foreground font-medium text-sm border border-accent/30">
                  <Sparkles className="w-4 h-4" />
                  <span>A gift everyone will treasure</span>
                </div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/15 text-primary font-bold text-sm border border-primary/30">
                  <Camera className="w-4 h-4" />
                  <span>From 2 to 100 photos — you decide</span>
                </div>
              </div>
              <h1 className="text-5xl lg:text-6xl xl:text-7xl font-serif font-bold text-foreground leading-[1.1] mb-6">
                The photos on your phone <span className="text-primary italic">deserve</span> to be colored in.
              </h1>
              <p className="text-lg lg:text-xl text-muted-foreground mb-6 leading-relaxed">
                We take your real-life moments — anywhere from <strong className="text-foreground">just 2 photos</strong> for a quick keepsake to <strong className="text-foreground">a full 100-photo</strong> family chronicle — and turn them into line-art coloring pages, packaged in a beautiful keepsake book. Print it. Ship it. Treasure it forever.
              </p>

              {/* Photo-range emphasis strip */}
              <div className="mb-8 rounded-2xl border-2 border-primary/30 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 p-4 sm:p-5">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-center justify-center w-14 h-14 rounded-xl bg-primary text-primary-foreground shadow-md flex-shrink-0">
                      <span className="text-xl font-serif font-bold leading-none">2</span>
                      <span className="text-[9px] font-semibold uppercase tracking-wider opacity-90 mt-0.5">min</span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-primary/60" />
                    <div className="flex flex-col items-center justify-center w-14 h-14 rounded-xl bg-primary text-primary-foreground shadow-md flex-shrink-0">
                      <span className="text-xl font-serif font-bold leading-none">100</span>
                      <span className="text-[9px] font-semibold uppercase tracking-wider opacity-90 mt-0.5">max</span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <p className="font-bold text-foreground text-base leading-tight">As few as <span className="text-primary">2 photos</span> or as many as <span className="text-primary">100</span>.</p>
                    <p className="text-sm text-muted-foreground mt-0.5">Big celebration or small moment — your book, your size.</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button asChild size="lg" className="rounded-full h-14 px-8 text-lg bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
                  <Link href="/create-book">
                    Create Your Book <ArrowRight className="ml-2 w-5 h-5" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="rounded-full h-14 px-8 text-lg border-2 hover:bg-secondary/10">
                  <Link href="#how-it-works">See How It Works</Link>
                </Button>
              </div>
            </div>
            
            {/* Three-stage transformation visual */}
            <div className="relative animate-in fade-in slide-in-from-right-8 duration-1000 delay-200">
              <div className="absolute -inset-8 bg-gradient-to-r from-accent/20 to-primary/20 blur-3xl rounded-full -z-10 opacity-60"></div>

              {/* Floating badge */}
              <div className="absolute -top-5 right-0 bg-white px-3 py-2 rounded-2xl shadow-xl rotate-6 animate-in zoom-in duration-700 delay-700 border border-border z-10">
                <div className="flex items-center gap-1.5 text-primary font-bold font-serif text-sm">
                  <Heart className="w-3.5 h-3.5 fill-current" />
                  Made with love
                </div>
              </div>

              {/* Hero showcase: large feature image + 2 supporting tiles */}
              <div className="grid grid-cols-2 gap-3 lg:gap-4">
                {/* Featured: printed book — spans 2 cols, larger */}
                <div className="col-span-2 relative overflow-hidden rounded-3xl shadow-2xl border-4 border-white/70 bg-white aspect-[16/10] ring-2 ring-primary/30 group">
                  <img
                    src={heroStep3}
                    alt="Your printed coloring book"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/70 via-transparent to-transparent" />
                  <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-white/80 text-[10px] font-bold uppercase tracking-widest mb-0.5">The final gift</p>
                      <p className="text-white font-serif font-bold text-xl lg:text-2xl leading-tight">Printed Coloring Book</p>
                    </div>
                    <span className="shrink-0 inline-flex items-center gap-1 bg-white/90 backdrop-blur text-primary text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
                      <BookOpen className="w-3 h-3" />
                      Hardcover
                    </span>
                  </div>
                </div>

                {/* Supporting tile 1: original photos */}
                <div className="relative overflow-hidden rounded-2xl shadow-lg border-2 border-white/60 bg-white aspect-square group">
                  <img
                    src={heroStep1}
                    alt="Your personal color photos"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-2 left-2 inline-flex items-center gap-1 bg-white/95 backdrop-blur text-foreground text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shadow-sm">
                    <Camera className="w-3 h-3 text-primary" />
                    Your Photos
                  </div>
                </div>

                {/* Supporting tile 2: coloring pages */}
                <div className="relative overflow-hidden rounded-2xl shadow-lg border-2 border-white/60 bg-white aspect-square group">
                  <img
                    src={heroStep2}
                    alt="AI-generated coloring pages"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-2 left-2 inline-flex items-center gap-1 bg-white/95 backdrop-blur text-foreground text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shadow-sm">
                    <Wand2 className="w-3 h-3 text-primary" />
                    Coloring Pages
                  </div>
                </div>
              </div>

              {/* Trust strip below images — fills vertical height */}
              <div className="mt-5 lg:mt-6 grid grid-cols-3 gap-2 lg:gap-3">
                <div className="flex flex-col items-center text-center p-3 rounded-2xl bg-card/70 backdrop-blur border border-border">
                  <span className="text-xl lg:text-2xl font-serif font-bold text-primary leading-none">2–100</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mt-1">Photos</span>
                </div>
                <div className="flex flex-col items-center text-center p-3 rounded-2xl bg-card/70 backdrop-blur border border-border">
                  <span className="text-xl lg:text-2xl font-serif font-bold text-primary leading-none">5–7</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mt-1">Days to Ship</span>
                </div>
                <div className="flex flex-col items-center text-center p-3 rounded-2xl bg-card/70 backdrop-blur border border-border">
                  <span className="text-xl lg:text-2xl font-serif font-bold text-primary leading-none">100%</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mt-1">Personalized</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Who It's For */}
      <section className="py-16 border-y border-border bg-muted/30">
        <div className="container mx-auto px-4 md:px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-10">A perfect gift for every chapter of life</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: Baby, label: "Kids & Toddlers", desc: "Color their own adventures" },
              { icon: Users, label: "Grandparents", desc: "Family memories preserved" },
              { icon: Dog, label: "Pet Lovers", desc: "Fur babies as coloring art" },
              { icon: Sunset, label: "Couples & Friends", desc: "Anniversaries & milestones" },
            ].map((item, i) => (
              <div key={i} className="flex flex-col items-center text-center p-6 rounded-2xl bg-card border border-border hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <item.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-bold font-serif text-base mb-1">{item.label}</h3>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Photo-range highlight */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-5xl mx-auto rounded-[3rem] border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-accent/5 to-primary/10 p-10 md:p-16 text-center relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-accent/10 blur-3xl pointer-events-none" />

            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary text-primary-foreground font-bold text-sm mb-6 shadow-md">
                <Camera className="w-4 h-4" />
                <span>UNMATCHED FLEXIBILITY</span>
              </div>

              <h2 className="text-4xl md:text-6xl font-serif font-bold mb-6 leading-tight">
                From <span className="text-primary">2 photos</span> to <span className="text-primary">100 photos</span>.<br className="hidden md:block" />
                <span className="text-foreground/80">Your story, your size.</span>
              </h2>

              <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-10 leading-relaxed">
                Whether you've got a single afternoon worth of memories or a full year of moments, we've got you. <strong className="text-foreground">Start with as little as 2 photos. Go all the way up to 100.</strong> No pressure, no minimums beyond two — just the perfect-sized book for the story you want to tell.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto mb-10">
                <div className="rounded-2xl bg-card border border-border p-5 shadow-sm">
                  <div className="text-4xl font-serif font-bold text-primary mb-1">2+</div>
                  <p className="text-sm font-semibold text-foreground mb-1">Minimum photos</p>
                  <p className="text-xs text-muted-foreground">Tiny keepsake, big heart</p>
                </div>
                <div className="rounded-2xl bg-card border border-border p-5 shadow-sm">
                  <div className="text-4xl font-serif font-bold text-primary mb-1">100</div>
                  <p className="text-sm font-semibold text-foreground mb-1">Maximum photos</p>
                  <p className="text-xs text-muted-foreground">A full chronicle of memories</p>
                </div>
                <div className="rounded-2xl bg-card border border-border p-5 shadow-sm">
                  <div className="flex justify-center mb-1">
                    <BookOpen className="w-9 h-9 text-primary" />
                  </div>
                  <p className="text-sm font-semibold text-foreground mb-1">One beautiful book</p>
                  <p className="text-xs text-muted-foreground">Perfectly sized to your story</p>
                </div>
              </div>

              <Button asChild size="lg" className="rounded-full h-14 px-10 text-lg bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
                <Link href="/create-book">
                  Start with Your Photos <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="py-24 bg-muted/50 border-y border-border">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-5xl font-serif font-bold mb-4">Magic in three simple steps</h2>
            <p className="text-lg text-muted-foreground">Creating a personalized gift has never been easier. We do the heavy lifting, you take the credit.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Choose a Style",
                desc: `Select between ${visibleStyles.map(s => s.name).join(visibleStyles.length === 2 ? " or " : ", ").replace(/, ([^,]+)$/, visibleStyles.length > 2 ? ", or $1" : "$1")} line art — whether it's for a toddler with crayons or an adult with colored pencils.`,
                icon: Wand2,
                color: "bg-primary/10 text-primary border-primary/20"
              },
              {
                step: "02",
                title: "Upload 2 to 100 Photos",
                desc: "As few as 2 photos for a tiny keepsake, or up to 100 for a sprawling family chronicle. Drop in the grandkids, your dog, a couple's trip, or every milestone of the year. Your book, your size.",
                icon: ImageIcon,
                color: "bg-secondary/20 text-secondary-foreground border-secondary/30"
              },
              {
                step: "03",
                title: "Give the Gift",
                desc: "Download instantly as a PDF or order a beautifully printed book shipped to your door. Perfect for any occasion.",
                icon: Gift,
                color: "bg-accent/20 text-accent-foreground border-accent/30"
              }
            ].map((s, i) => (
              <div key={i} className="relative p-8 bg-card rounded-[2rem] border border-border shadow-sm hover:shadow-md transition-shadow">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 border ${s.color}`}>
                  <s.icon className="w-6 h-6" />
                </div>
                <div className="absolute top-8 right-8 text-6xl font-serif font-bold text-muted/50 pointer-events-none select-none">
                  {s.step}
                </div>
                <h3 className="text-2xl font-bold font-serif mb-3 relative z-10">{s.title}</h3>
                <p className="text-muted-foreground relative z-10 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Styles Showcase */}
      <section className="py-24">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-5xl font-serif font-bold mb-4">A style for everyone</h2>
            <p className="text-lg text-muted-foreground">Our AI adapts to create the perfect coloring experience — from toddlers to adults who love to unwind with colored pencils.</p>
          </div>
          
          <div className={`grid gap-8 ${visibleStyles.length >= 3 ? "md:grid-cols-3" : visibleStyles.length === 2 ? "md:grid-cols-2 max-w-3xl mx-auto" : "max-w-md mx-auto"}`}>
            {visibleStyles.map(style => (
              <div key={style.id} className="group text-center">
                <div className="overflow-hidden rounded-3xl border-4 border-border mb-6 bg-muted">
                  <img src={style.img} alt={`${style.name} Style`} className="w-full aspect-square object-cover transition-transform duration-500 group-hover:scale-105" />
                </div>
                <h3 className="text-2xl font-bold font-serif mb-2">{style.name}</h3>
                <p className="text-muted-foreground">{style.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Occasions */}
      <section className="py-20 bg-muted/30 border-y border-border">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">Meaningful for every occasion</h2>
            <p className="text-lg text-muted-foreground">ColorGifts is the gift that says you actually put thought into it.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            {[
              "Birthdays", "Mother's Day", "Father's Day", "Grandparent's Day",
              "Anniversaries", "Valentine's Day", "Baby Showers", "Christmas",
              "Just Because", "Pet Memorials", "Retirement", "Graduation"
            ].map((occasion) => (
              <span key={occasion} className="px-5 py-2.5 rounded-full bg-card border border-border text-sm font-medium text-foreground hover:bg-primary/10 hover:border-primary/30 transition-colors cursor-default">
                {occasion}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-primary text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay"></div>
        <div className="container mx-auto px-4 md:px-6 relative z-10 text-center">
          <h2 className="text-4xl md:text-6xl font-serif font-bold mb-6">A gift they'll never forget.</h2>
          <p className="text-xl opacity-90 max-w-2xl mx-auto mb-4">
            Start creating your personalized coloring book today. A few minutes of your time, a lifetime of memories.
          </p>
          <p className="text-base font-semibold opacity-95 max-w-2xl mx-auto mb-10 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-background/15 border border-background/30">
            <Camera className="w-4 h-4" />
            Works with as few as 2 photos — or as many as 100.
          </p>
          <Button asChild size="lg" className="rounded-full h-16 px-10 text-xl bg-background text-foreground hover:bg-background/90 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1">
            <Link href="/create-book">Create Your Book Now</Link>
          </Button>
        </div>
      </section>
    </Layout>
  );
}
