import { Layout } from "@/components/layout";
import { SEO } from "@/components/seo";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Sparkles, Heart, Wand2, ArrowRight, ImageIcon, Gift, Users, Dog, Baby, Sunset, ChevronRight } from "lucide-react";
import heroStep1 from "@/assets/hero-step1-photos.png";
import heroStep2 from "@/assets/hero-step2-coloring.png";
import heroStep3 from "@/assets/hero-step3-book.png";
import simpleStyleImg from "@/assets/style-simple.png";
import cartoonStyleImg from "@/assets/style-cartoon.png";
import detailedStyleImg from "@/assets/style-detailed.png";

export default function Home() {
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
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/20 text-accent-foreground font-medium text-sm mb-6 border border-accent/30">
                <Sparkles className="w-4 h-4" />
                <span>A gift everyone will treasure</span>
              </div>
              <h1 className="text-5xl lg:text-7xl font-serif font-bold text-foreground leading-[1.1] mb-6">
                Turn Your Favorite <span className="text-primary italic">Memories</span> Into a Coloring Book.
              </h1>
              <p className="text-lg lg:text-xl text-muted-foreground mb-8 leading-relaxed">
                Upload photos of family, pets, adventures, or milestones — and watch them become beautiful, personal line-art coloring pages. A meaningful gift for any age, any occasion.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button asChild size="lg" className="rounded-full h-14 px-8 text-lg bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
                  <Link href="/create">
                    Start Your Book <ArrowRight className="ml-2 w-5 h-5" />
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

              <div className="flex items-end gap-2 w-full">
                {/* Stage 1: Color Photos */}
                <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
                  <div className="relative w-full overflow-hidden rounded-2xl shadow-lg border-2 border-white/60 bg-white aspect-[4/5]">
                    <img
                      src={heroStep1}
                      alt="Your personal color photos"
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground whitespace-nowrap">Your Photos</span>
                </div>

                {/* Arrow 1 */}
                <div className="shrink-0 pb-6">
                  <ChevronRight className="w-6 h-6 text-primary" strokeWidth={2.5} />
                </div>

                {/* Stage 2: Coloring Pages */}
                <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
                  <div className="relative w-full overflow-hidden rounded-2xl shadow-lg border-2 border-white/60 bg-white aspect-[4/5]">
                    <img
                      src={heroStep2}
                      alt="AI-generated coloring pages"
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground whitespace-nowrap">Coloring Pages</span>
                </div>

                {/* Arrow 2 */}
                <div className="shrink-0 pb-6">
                  <ChevronRight className="w-6 h-6 text-primary" strokeWidth={2.5} />
                </div>

                {/* Stage 3: Physical Book */}
                <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
                  <div className="relative w-full overflow-hidden rounded-2xl shadow-xl border-2 border-white/60 bg-white aspect-[4/5] ring-2 ring-primary/30">
                    <img
                      src={heroStep3}
                      alt="Your printed coloring book"
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-primary/80 to-transparent p-2 text-center">
                      <span className="text-white text-[10px] font-bold uppercase tracking-wider">Printed Book</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-primary whitespace-nowrap">Your Book</span>
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
                desc: "Select between Simple, Cartoon, or Detailed line art — whether it's for a toddler with crayons or an adult with colored pencils.",
                icon: Wand2,
                color: "bg-primary/10 text-primary border-primary/20"
              },
              {
                step: "02",
                title: "Upload Your Photos",
                desc: "Drop in photos of the grandkids, your dog, a couple's trip, or a milestone moment. The more personal, the more meaningful.",
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
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="group text-center">
              <div className="overflow-hidden rounded-3xl border-4 border-border mb-6 bg-muted">
                <img src={simpleStyleImg} alt="Simple Style" className="w-full aspect-square object-cover transition-transform duration-500 group-hover:scale-105" />
              </div>
              <h3 className="text-2xl font-bold font-serif mb-2">Simple</h3>
              <p className="text-muted-foreground">Thick, bold outlines with minimal detail. Great for young children and anyone who prefers a relaxing, easy coloring experience.</p>
            </div>
            
            <div className="group text-center">
              <div className="overflow-hidden rounded-3xl border-4 border-border mb-6 bg-muted">
                <img src={cartoonStyleImg} alt="Cartoon Style" className="w-full aspect-square object-cover transition-transform duration-500 group-hover:scale-105" />
              </div>
              <h3 className="text-2xl font-bold font-serif mb-2">Cartoon</h3>
              <p className="text-muted-foreground">Expressive, warm, and full of character. Perfect for families, pet portraits, and anyone who wants a touch of whimsy.</p>
            </div>
            
            <div className="group text-center">
              <div className="overflow-hidden rounded-3xl border-4 border-border mb-6 bg-muted">
                <img src={detailedStyleImg} alt="Detailed Style" className="w-full aspect-square object-cover transition-transform duration-500 group-hover:scale-105" />
              </div>
              <h3 className="text-2xl font-bold font-serif mb-2">Detailed</h3>
              <p className="text-muted-foreground">Intricate lines and rich texture. Ideal for adults, mindful coloring, and anyone who loves the meditative quality of fine detail.</p>
            </div>
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
          <p className="text-xl opacity-90 max-w-2xl mx-auto mb-10">
            Start creating your personalized coloring book today. A few minutes of your time, a lifetime of memories.
          </p>
          <Button asChild size="lg" className="rounded-full h-16 px-10 text-xl bg-background text-foreground hover:bg-background/90 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1">
            <Link href="/create">Create Your Book Now</Link>
          </Button>
        </div>
      </section>
    </Layout>
  );
}
