import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { Footer } from "@/components/landing/Footer";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0A0F0D] text-white overflow-x-hidden selection:bg-emerald-500/30 selection:text-emerald-200">
      <Navbar />
      <Hero />
      <Features />
      <Footer />
    </main>
  );
}
