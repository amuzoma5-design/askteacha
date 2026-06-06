import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  GraduationCap,
  ArrowRight,
  MessageCircle,
  Camera,
  Mic,
  BookOpen,
  CheckCircle2,
  Lightbulb,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";
import { getProfile } from "@/lib/profile";
import heroImg from "@/assets/hero-illustration.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AskTeacha — Your AI Teacher for WAEC, NECO & JAMB" },
      {
        name: "description",
        content:
          "AskTeacha is a personal AI teacher for Nigerian SS1–SS3 students preparing for WAEC, NECO and JAMB. Ask any question and get step-by-step explanations.",
      },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  const [hasProfile, setHasProfile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setHasProfile(!!getProfile());
  }, []);

  const appLink = hasProfile ? "/home" : "/onboarding";

  const trySample = () => {
    const sample = "Explain photosynthesis in simple terms";
    sessionStorage.setItem("askteacha.pending", JSON.stringify({ question: sample }));
    window.location.href = "/answer";
  };

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900">
      {/* Navigation */}
      <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3.5">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
              <GraduationCap className="h-5 w-5" />
            </span>
            <span className="text-lg font-bold tracking-tight">
              Ask<span className="text-blue-600">Teacha</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-6 md:flex">
            <a href="#how-it-works" className="text-sm font-medium text-slate-600 hover:text-slate-900">
              How it works
            </a>
            <a href="#features" className="text-sm font-medium text-slate-600 hover:text-slate-900">
              Features
            </a>
            <Link
              to={appLink}
              className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              {hasProfile ? "Open App" : "Start Learning Free"}
            </Link>
          </nav>

          {/* Mobile menu toggle */}
          <button
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile nav */}
        {mobileMenuOpen && (
          <div className="border-t border-slate-100 px-5 py-4 md:hidden">
            <div className="flex flex-col gap-3">
              <a
                href="#how-it-works"
                className="text-sm font-medium text-slate-600"
                onClick={() => setMobileMenuOpen(false)}
              >
                How it works
              </a>
              <a
                href="#features"
                className="text-sm font-medium text-slate-600"
                onClick={() => setMobileMenuOpen(false)}
              >
                Features
              </a>
              <Link
                to={appLink}
                className="mt-1 rounded-lg bg-blue-600 px-4 py-2.5 text-center text-sm font-semibold text-white"
                onClick={() => setMobileMenuOpen(false)}
              >
                {hasProfile ? "Open App" : "Start Learning Free"}
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-5 pt-10 pb-16 md:pt-16 md:pb-24">
        <div className="grid items-center gap-10 md:grid-cols-2 md:gap-12">
          <div className="order-2 md:order-1">
            <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              <Lightbulb className="h-3.5 w-3.5" />
              AI-powered learning for Nigerian students
            </div>
            <h1 className="text-[1.75rem] font-extrabold leading-snug tracking-tight text-slate-900 md:text-[2.5rem]">
              AskTeacha — Your Personal AI Teacher for WAEC, NECO & JAMB
            </h1>
            <p className="mt-4 text-base leading-relaxed text-slate-600 md:text-lg">
              Ask any question. Get step-by-step explanations like a real teacher.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                to={appLink}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-semibold text-white shadow-md transition hover:bg-blue-700"
              >
                Start Learning Free
                <ArrowRight className="h-4 w-4" />
              </Link>
              <button
                onClick={trySample}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                Try a Sample Question
              </button>
            </div>
          </div>
          <div className="order-1 flex justify-center md:order-2">
            <img
              src={heroImg}
              alt="Student learning with AI teacher"
              width={420}
              height={420}
              className="h-auto w-full max-w-[420px]"
            />
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="bg-slate-50 py-14 md:py-20">
        <div className="mx-auto max-w-3xl px-5 text-center">
          <h2 className="text-xl font-bold tracking-tight text-slate-900 md:text-2xl">
            Students don’t fail because they don’t study. They fail because they don’t understand.
          </h2>
          <ul className="mt-8 grid gap-4 text-left sm:grid-cols-2">
            {[
              "Confusing textbooks and difficult explanations",
              "No access to teachers at home",
              "Too many topics and not enough guidance",
              "Students struggle with understanding, not information",
            ].map((item) => (
              <li
                key={item}
                className="flex items-start gap-3 rounded-xl bg-white p-4 shadow-sm"
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-100">
                  <span className="h-2 w-2 rounded-full bg-red-500" />
                </span>
                <span className="text-sm font-medium text-slate-700">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Solution / Features */}
      <section id="features" className="mx-auto max-w-5xl px-5 py-14 md:py-20">
        <div className="text-center">
          <h2 className="text-xl font-bold tracking-tight text-slate-900 md:text-2xl">
            AskTeacha explains everything like a real teacher.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-base text-slate-600">
            AskTeacha is an AI learning assistant that breaks down complex topics into simple, easy-to-understand steps.
          </p>
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <FeatureCard
            icon={<MessageCircle className="h-6 w-6 text-blue-600" />}
            title="Step-by-step explanations"
            text="Get clear, simple answers for any question you ask."
          />
          <FeatureCard
            icon={<Camera className="h-6 w-6 text-blue-600" />}
            title="Snap and solve"
            text="Upload a photo of any question and get the solution instantly."
          />
          <FeatureCard
            icon={<Mic className="h-6 w-6 text-blue-600" />}
            title="Voice-based asking"
            text="Speak your question naturally — no typing needed."
          />
          <FeatureCard
            icon={<BookOpen className="h-6 w-6 text-blue-600" />}
            title="WAEC, NECO & JAMB"
            text="Focused on the exact syllabus and exam methods you need."
          />
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="bg-blue-50 py-14 md:py-20">
        <div className="mx-auto max-w-4xl px-5">
          <h2 className="text-center text-xl font-bold tracking-tight text-slate-900 md:text-2xl">
            How AskTeacha Works
          </h2>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {[
              {
                step: "01",
                title: "Ask your question",
                text: "Type, speak, or snap a photo of any question.",
              },
              {
                step: "02",
                title: "AI teacher explains",
                text: "Receive a clear, step-by-step breakdown like a real teacher.",
              },
              {
                step: "03",
                title: "Understand faster",
                text: "Grasp concepts quickly and improve your exam results.",
              },
            ].map((s) => (
              <div
                key={s.step}
                className="relative rounded-2xl bg-white p-6 shadow-sm"
              >
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
                  Step {s.step}
                </span>
                <h3 className="mt-2 text-base font-bold text-slate-900">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sample Questions */}
      <section className="mx-auto max-w-5xl px-5 py-14 md:py-20">
        <h2 className="text-center text-xl font-bold tracking-tight text-slate-900 md:text-2xl">
          Try real student questions
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            "Explain photosynthesis in simple terms",
            "Solve quadratic equation x² + 5x + 6 = 0",
            "What is government revenue?",
          ].map((q) => (
            <button
              key={q}
              onClick={() => {
                sessionStorage.setItem("askteacha.pending", JSON.stringify({ question: q }));
                window.location.href = "/answer";
              }}
              className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-blue-300 hover:shadow-md"
            >
              <span className="text-sm font-semibold text-slate-800">{q}</span>
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
            </button>
          ))}
        </div>
      </section>

      {/* Trust */}
      <section className="bg-slate-50 py-12 md:py-16">
        <div className="mx-auto max-w-3xl px-5 text-center">
          <h2 className="text-lg font-bold tracking-tight text-slate-900 md:text-xl">
            Built for Nigerian students preparing for national exams
          </h2>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            {["WAEC", "NECO", "JAMB"].map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200"
              >
                {tag}
              </span>
            ))}
          </div>
          <p className="mt-6 text-sm text-slate-500">
            Trusted by students across Nigeria who want to understand — not just memorize.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-3xl px-5 py-14 text-center md:py-20">
        <h2 className="text-xl font-bold tracking-tight text-slate-900 md:text-2xl">
          Start learning smarter today
        </h2>
        <p className="mt-3 text-base text-slate-600">
          Join students using AskTeacha to understand difficult subjects faster.
        </p>
        <div className="mt-8">
          <Link
            to={appLink}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-8 py-4 text-base font-semibold text-white shadow-lg transition hover:bg-blue-700"
          >
            Get Started Free
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 bg-white py-10">
        <div className="mx-auto max-w-5xl px-5">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
                <GraduationCap className="h-4 w-4" />
              </span>
              <span className="text-sm font-bold">
                Ask<span className="text-blue-600">Teacha</span>
              </span>
            </div>
            <nav className="flex flex-wrap items-center justify-center gap-5 text-sm text-slate-500">
              <Link to="/" className="hover:text-slate-800">
                Home
              </Link>
              <a href="#features" className="hover:text-slate-800">
                Features
              </a>
              <a
                href="#"
                className="hover:text-slate-800"
                onClick={(e) => {
                  e.preventDefault();
                  alert("Coming soon");
                }}
              >
                Privacy Policy
              </a>
              <a
                href="#"
                className="hover:text-slate-800"
                onClick={(e) => {
                  e.preventDefault();
                  alert("Coming soon");
                }}
              >
                Terms
              </a>
              <a
                href="#"
                className="hover:text-slate-800"
                onClick={(e) => {
                  e.preventDefault();
                  alert("Coming soon");
                }}
              >
                Contact
              </a>
            </nav>
          </div>
          <p className="mt-6 text-center text-xs text-slate-400">
            © 2026 AskTeacha. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
        {icon}
      </div>
      <h3 className="mt-4 text-sm font-bold text-slate-900">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{text}</p>
    </div>
  );
}
