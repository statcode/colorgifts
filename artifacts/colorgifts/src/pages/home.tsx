import { Layout } from "@/components/layout";
import { SEO } from "@/components/seo";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Sparkles, Heart, Wand2, ArrowRight, ImageIcon, Gift } from "lucide-react";
import heroImg from "@/assets/hero.png";
import simpleStyleImg from "@/assets/style-simple.png";
import cartoonStyleImg from "@/assets/style-cartoon.png";
import detailedStyleImg from "@/assets/style-detailed.png";

export default function Home() {
  return (
    <Layout>
      <SEO 
        title="Turn Memories into Coloring Books" 
        description="Upload your favorite photos and transform them into personalized, magical coloring books for kids. The perfect heartfelt gift."
      />
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-24 lg:pt-24 lg:pb-32">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-background to-background"></div>
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            <div className="max-w-2xl animate-in fade-in slide-in-from-bottom-8 duration-1000">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/20 text-accent-foreground font-medium text-sm mb-6 border border-accent/30">
                <Sparkles className="w-4 h-4" />
                <span>The most magical gift for kids</span>
              </div>
              <h1 className="text-5xl lg:text-7xl font-serif font-bold text-foreground leading-[1.1] mb-6">
                Turn Your Favorite <span className="text-primary italic">Memories</span> Into a Coloring Book.
              </h1>
              <p className="text-lg lg:text-xl text-muted-foreground mb-8 leading-relaxed">
                Upload photos of your family, pets, and adventures, and watch them transform into beautiful, custom line-art coloring pages. A heartfelt, tangible gift they'll color with joy.
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
            
            <div className="relative animate-in fade-in slide-in-from-right-8 duration-1000 delay-200">
              <div className="absolute -inset-4 bg-gradient-to-r from-accent/20 to-primary/20 blur-3xl rounded-full -z-10 opacity-70"></div>
              <img 
                src={heroImg} 
                alt="Transformation from photo to coloring book" 
                className="w-full h-auto rounded-[2rem] shadow-2xl border-4 border-white/50 rotate-2 hover:rotate-0 transition-transform duration-700 object-cover"
              />
              
              {/* Floating badges */}
              <div className="absolute -top-6 -right-6 bg-white p-4 rounded-2xl shadow-xl rotate-12 animate-in zoom-in duration-700 delay-700">
                <div className="flex items-center gap-2 text-primary font-bold font-serif text-lg">
                  <Heart className="w-5 h-5 fill-current" />
                  Made with love
                </div>
              </div>
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
                desc: "Select between Simple, Cartoon, or Detailed line art to perfectly match the age of the little artist.",
                icon: Wand2,
                color: "bg-primary/10 text-primary border-primary/20"
              },
              {
                step: "02",
                title: "Upload Photos",
                desc: "Drop in photos of grandma, the dog, or that family vacation. The more personal, the better.",
                icon: ImageIcon,
                color: "bg-secondary/20 text-secondary-foreground border-secondary/30"
              },
              {
                step: "03",
                title: "Gift the Magic",
                desc: "Download instantly as a PDF to print at home, or order a beautifully bound physical book.",
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
            <h2 className="text-3xl md:text-5xl font-serif font-bold mb-4">A style for every age</h2>
            <p className="text-lg text-muted-foreground">Our AI adapts to create the perfect coloring experience, whether they're 3 or 93.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="group text-center">
              <div className="overflow-hidden rounded-3xl border-4 border-border mb-6 bg-muted">
                <img src={simpleStyleImg} alt="Simple Style" className="w-full aspect-square object-cover transition-transform duration-500 group-hover:scale-105" />
              </div>
              <h3 className="text-2xl font-bold font-serif mb-2">Simple</h3>
              <p className="text-muted-foreground">Thick lines and minimal details. Perfect for toddlers and thick crayons.</p>
            </div>
            
            <div className="group text-center">
              <div className="overflow-hidden rounded-3xl border-4 border-border mb-6 bg-muted">
                <img src={cartoonStyleImg} alt="Cartoon Style" className="w-full aspect-square object-cover transition-transform duration-500 group-hover:scale-105" />
              </div>
              <h3 className="text-2xl font-bold font-serif mb-2">Cartoon</h3>
              <p className="text-muted-foreground">Expressive, bubbly, and fun. The sweet spot for young children.</p>
            </div>
            
            <div className="group text-center">
              <div className="overflow-hidden rounded-3xl border-4 border-border mb-6 bg-muted">
                <img src={detailedStyleImg} alt="Detailed Style" className="w-full aspect-square object-cover transition-transform duration-500 group-hover:scale-105" />
              </div>
              <h3 className="text-2xl font-bold font-serif mb-2">Detailed</h3>
              <p className="text-muted-foreground">Intricate patterns and fine lines. Great for older kids and colored pencils.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-primary text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay"></div>
        <div className="container mx-auto px-4 md:px-6 relative z-10 text-center">
          <h2 className="text-4xl md:text-6xl font-serif font-bold mb-6">Ready to make them smile?</h2>
          <p className="text-xl opacity-90 max-w-2xl mx-auto mb-10">
            Start creating your personalized coloring book today. It only takes a few minutes to build a memory that lasts forever.
          </p>
          <Button asChild size="lg" className="rounded-full h-16 px-10 text-xl bg-background text-foreground hover:bg-background/90 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1">
            <Link href="/create">Create Your Book Now</Link>
          </Button>
        </div>
      </section>
    </Layout>
  );
}
