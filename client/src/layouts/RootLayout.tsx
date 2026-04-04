import { Outlet, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ScrollToTop } from "@/components/ScrollToTop";

export default function RootLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen text-foreground selection:bg-cyan-500/30 selection:text-white">
      {/* Global Background Layer */}
      <div className="fixed inset-0 -z-20 bg-[#07090d]" />
      
      {/* Static Aurora Background */}
      <div className="pointer-events-none fixed inset-0 -z-10" style={{
        background: 'radial-gradient(circle at 10% -10%, rgba(192, 38, 211, 0.35) 0%, transparent 60%), radial-gradient(circle at 90% 110%, rgba(6, 182, 212, 0.4) 0%, transparent 65%), radial-gradient(circle at 60% 30%, rgba(139, 92, 246, 0.25) 0%, transparent 60%), radial-gradient(circle at 20% 70%, rgba(244, 63, 94, 0.2) 0%, transparent 55%)'
      }} />
      <div className="relative z-0 flex flex-col min-h-screen">
        <Navbar />
        <ScrollToTop />

        <main className="flex-1 min-h-[calc(100vh-360px)]">
          <Outlet />
        </main>

        <Footer />
      </div>

      <Toaster position="top-right" richColors closeButton theme="dark" />
    </div>
  );
}
