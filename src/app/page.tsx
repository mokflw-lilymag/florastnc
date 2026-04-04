import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { Footer } from "@/components/landing/Footer";

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-slate-900 overflow-x-hidden selection:bg-[#E8F3EE] selection:text-[#1B4B43]">
      <Navbar />
      <Hero />
      <Features />
      <Footer />
    </main>
  );
}
