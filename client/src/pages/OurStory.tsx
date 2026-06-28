import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "wouter";
import { FinsightLiteLogo } from "@/components/FinsightLiteLogo";
import { ArrowRight, BookOpen, Gamepad2, TrendingUp, Handshake, BadgeCheck, MapPin } from "lucide-react";

const TICKERS = ["CBL", "FCL", "CAB", "DHS", "JSJ", "CHB"];

const TERRITORIES = [
  "The Bahamas",
  "Barbados",
  "Jamaica",
  "Trinidad and Tobago",
  "Eastern Caribbean",
];

const FEATURES = [
  {
    Icon: BookOpen,
    tint: "bg-violet-500/15",
    iconColor: "text-violet-500",
    title: "Learn",
    body: "Nine core lessons across three foundational modules, covering saving, budgeting, and smart financial decision-making, built to meet students where they are.",
  },
  {
    Icon: Gamepad2,
    tint: "bg-teal-500/15",
    iconColor: "text-teal-500",
    title: "Play",
    body: "Seven hands-on money games, including Beat the Budget, that turn financial concepts into real practice instead of theory.",
  },
  {
    Icon: TrendingUp,
    tint: "bg-amber-500/15",
    iconColor: "text-amber-500",
    title: "Invest (virtually)",
    body: "A live Investment Simulator using six real BISX-listed stocks, with six reading modules localized for each territory we serve.",
    tickers: TICKERS,
  },
];

const SUPPORT = [
  {
    title: "Money Guide",
    body: "An AI chatbot students can ask real questions, anytime.",
  },
  {
    title: "AI Tutor",
    body: "Automatically steps in when a student's quiz scores show they need extra support.",
  },
  {
    title: "AI-generated spending tips",
    body: "Personalized nudges based on real activity, not generic advice.",
  },
];

const PARTNERS = [
  { Icon: Handshake, label: "The Financial Academy" },
  { Icon: BadgeCheck, label: "ISTE Learning Technology Directory" },
];

// Fades a block in the first time it scrolls into view. Falls back to visible
// when IntersectionObserver is unavailable so nothing is ever hidden.
function Reveal({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-7"
      } ${className}`}
    >
      {children}
    </div>
  );
}

// Small amber eyebrow label. On caribbean-bg it stays light; on an adaptive
// glass-card it pairs a light and dark tint so it survives both themes.
function Eyebrow({ children, onCard = false }: { children: ReactNode; onCard?: boolean }) {
  return (
    <span
      className={`inline-block font-display font-bold text-xs uppercase tracking-[0.12em] mb-3.5 ${
        onCard ? "text-amber-700 dark:text-amber-300" : "text-amber-300"
      }`}
    >
      {children}
    </span>
  );
}

export default function OurStory() {
  useEffect(() => {
    const previous = document.title;
    document.title = "Our Story | Finsight Lite";
    return () => {
      document.title = previous;
    };
  }, []);

  return (
    <div className="min-h-screen caribbean-bg">
      <div className="relative z-10">
        {/* TOP NAV */}
        <header>
          <nav className="max-w-6xl mx-auto flex items-center justify-between gap-4 px-6 py-5">
            <Link href="/" className="shrink-0" data-testid="link-home-logo">
              <FinsightLiteLogo size={28} className="text-white" data-testid="img-logo-ourstory-nav" />
            </Link>
            <Link
              href="/"
              className="btn-primary inline-flex items-center gap-1.5 text-sm"
              data-testid="button-nav-get-started"
            >
              Get Started
              <ArrowRight className="w-4 h-4" />
            </Link>
          </nav>
        </header>

        {/* HERO */}
        <section className="max-w-4xl mx-auto px-6 pt-10 pb-16 sm:pt-14 text-center">
          <div className="animate-pop-in inline-block mb-9">
            <FinsightLiteLogo size={60} className="text-white" data-testid="img-logo-ourstory-hero" />
          </div>
          <h1
            className="animate-pop-in font-display font-bold text-white text-3xl sm:text-5xl md:text-[3.4rem] leading-[1.12] max-w-3xl mx-auto mb-5"
            data-testid="text-hero-title"
          >
            Money skills for the next generation of the Caribbean.
          </h1>
          <p className="animate-pop-in text-white/80 text-lg max-w-xl mx-auto mb-9">
            Finsight Lite helps young learners build real financial confidence through games, simulations, and
            lessons made for their world, not someone else's.
          </p>
          <Link
            href="/"
            className="btn-primary inline-flex items-center gap-2 text-base animate-pop-in"
            data-testid="button-hero-start"
          >
            Start Learning
            <ArrowRight className="w-4 h-4" />
          </Link>
        </section>

        {/* ISTE TRUST STRIP */}
        <section className="max-w-2xl mx-auto px-6 py-8">
          <Reveal>
            <div className="glass-card p-6 sm:p-7 flex flex-wrap sm:flex-nowrap items-center gap-4">
              <div className="shrink-0 w-12 h-12 rounded-xl bg-muted flex items-end justify-center gap-1 p-2.5">
                <span className="w-1.5 h-3 rounded-full bg-violet-400" />
                <span className="w-1.5 h-5 rounded-full bg-teal-400" />
                <span className="w-1.5 h-7 rounded-full bg-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-display font-bold text-foreground text-sm sm:text-[15px]">
                  Listed in ISTE's Learning Technology Directory
                </p>
                <p className="text-muted-foreground text-xs font-semibold mt-0.5">
                  Verified EdTech product · ULTID P2BA4783BFDB4BC9EE
                </p>
              </div>
              <a
                href="https://index.edsurge.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 font-display font-bold text-xs px-4 py-2.5 rounded-full bg-violet-100 text-violet-700 hover:bg-violet-200 dark:bg-violet-900/40 dark:text-violet-300 dark:hover:bg-violet-900/60 transition-colors"
                data-testid="link-iste-profile"
              >
                View Profile
              </a>
            </div>
          </Reveal>
        </section>

        {/* WHAT IT IS */}
        <section className="max-w-3xl mx-auto px-6 py-14 sm:py-16 text-center">
          <Reveal>
            <Eyebrow>What it is</Eyebrow>
            <h2 className="font-display font-bold text-white text-2xl sm:text-3xl md:text-4xl mb-4">
              Built for the Caribbean. Built for ages 12 to 17.
            </h2>
            <p className="text-white/80 text-base max-w-xl mx-auto">
              Instead of generic global finance content, every lesson, simulation, and example is grounded in
              Caribbean realities: real markets, real currencies, real decisions students will actually face.
            </p>
          </Reveal>
        </section>

        {/* WHAT STUDENTS DO */}
        <section className="max-w-5xl mx-auto px-6 py-10 sm:py-14">
          <Reveal className="text-center mb-12">
            <Eyebrow>Inside the platform</Eyebrow>
            <h2 className="font-display font-bold text-white text-2xl sm:text-3xl md:text-4xl">
              What students actually do
            </h2>
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <Reveal key={f.title}>
                <div className="glass-card p-8 h-full" data-testid={`card-feature-${f.title.toLowerCase().split(" ")[0]}`}>
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-5 ${f.tint}`}>
                    <f.Icon className={`w-7 h-7 ${f.iconColor}`} />
                  </div>
                  <h3 className="font-display font-bold text-foreground text-lg mb-2.5">{f.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{f.body}</p>
                  {f.tickers && (
                    <div className="flex flex-wrap gap-2 mt-5">
                      {f.tickers.map((t) => (
                        <span
                          key={t}
                          className="font-display font-bold text-xs px-3.5 py-1.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                          data-testid={`pill-ticker-${t}`}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* AI SUPPORT */}
        <section className="max-w-2xl mx-auto px-6 py-10 sm:py-14">
          <Reveal>
            <div className="glass-card p-8 sm:p-10">
              <Eyebrow onCard>Built in, not bolted on</Eyebrow>
              <h2 className="font-display font-bold text-foreground text-xl sm:text-2xl mb-6">
                Help when it's needed, not just when it's asked for
              </h2>
              <div className="flex flex-col gap-5">
                {SUPPORT.map((s) => (
                  <div key={s.title} className="flex gap-4 items-start">
                    <span className="shrink-0 w-2.5 h-2.5 rounded-full bg-amber-400 mt-2" />
                    <div>
                      <h4 className="font-display font-bold text-foreground text-base mb-1">{s.title}</h4>
                      <p className="text-muted-foreground text-sm leading-relaxed">{s.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </section>

        {/* TERRITORIES */}
        <section className="max-w-3xl mx-auto px-6 py-14 sm:py-16 text-center">
          <Reveal>
            <Eyebrow>Where we work</Eyebrow>
            <h2 className="font-display font-bold text-white text-2xl sm:text-3xl md:text-4xl mb-7">
              Made for five territories, not adapted from somewhere else.
            </h2>
            <div className="flex flex-wrap justify-center gap-3.5">
              {TERRITORIES.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1.5 font-display font-semibold text-sm sm:text-[15px] px-5 py-2.5 rounded-full bg-white/10 border border-white/20 text-white"
                  data-testid={`pill-territory-${t.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <MapPin className="w-4 h-4 opacity-80" />
                  {t}
                </span>
              ))}
            </div>
          </Reveal>
        </section>

        {/* FOR TEACHERS */}
        <section className="max-w-2xl mx-auto px-6 py-10 sm:py-14">
          <Reveal>
            <div className="glass-card-light p-8 sm:p-10 pt-12 sm:pt-14">
              <Eyebrow onCard>For teachers</Eyebrow>
              <h3 className="font-display font-bold text-foreground text-xl sm:text-2xl mb-2.5">
                Built to fit your classroom, not replace it.
              </h3>
              <p className="text-muted-foreground text-base leading-relaxed">
                Teachers can link external YouTube videos or upload their own content for their specific classes,
                keeping lessons connected to what's already happening in the room.
              </p>
            </div>
          </Reveal>
        </section>

        {/* PARTNERS */}
        <section className="max-w-3xl mx-auto px-6 py-14 sm:py-16 text-center">
          <Reveal>
            <Eyebrow>Recognized in the field</Eyebrow>
            <h2 className="font-display font-bold text-white text-xl sm:text-2xl md:text-3xl mb-7">
              Trusted by educators, recognized by the index.
            </h2>
            <div className="flex flex-wrap justify-center gap-3.5">
              {PARTNERS.map((p) => (
                <span
                  key={p.label}
                  className="inline-flex items-center gap-2 font-display font-semibold text-sm sm:text-[15px] px-6 py-3 rounded-full bg-white/10 border border-white/20 text-white"
                >
                  <p.Icon className="w-4 h-4" />
                  {p.label}
                </span>
              ))}
            </div>
          </Reveal>
        </section>

        {/* FINAL CTA */}
        <section className="max-w-3xl mx-auto px-6 pt-8 pb-24 text-center">
          <Reveal>
            <h2 className="font-display font-bold text-white text-3xl sm:text-4xl mb-4">
              Ready to see it in action?
            </h2>
            <p className="text-white/80 mb-8 max-w-md mx-auto">
              Join students across the Caribbean building real financial confidence.
            </p>
            <Link
              href="/"
              className="btn-primary inline-flex items-center gap-2 text-base"
              data-testid="button-cta-get-started"
            >
              Get Started
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Reveal>
        </section>
      </div>
    </div>
  );
}
