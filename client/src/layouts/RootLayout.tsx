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
      
      {/* Aurora Background Blobs */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-24 -left-24 w-[600px] h-[600px] bg-fuchsia-600/20 blur-[120px] rounded-full" />
        <div className="absolute -bottom-32 -right-32 w-[700px] h-[700px] bg-cyan-500/20 blur-[120px] rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/15 blur-[100px] rounded-full" />
      </div>

      <div className="relative z-0 flex flex-col min-h-screen">
        <Navbar />
        <ScrollToTop />

        <main key={location.pathname} className="flex-1 page-enter min-h-[calc(100vh-360px)]">
          <Outlet />
        </main>

        <Footer />
      </div>

      <Toaster position="top-right" richColors closeButton theme="dark" />
    </div>
  );
}
