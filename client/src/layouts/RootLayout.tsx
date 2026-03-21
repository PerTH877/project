import { Outlet, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ScrollToTop } from "@/components/ScrollToTop";

export default function RootLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[-2%] top-[6%] h-[16rem] w-[16rem] rounded-full blur-[50px]" style={{ background: 'radial-gradient(circle, rgba(0,255,255,0.15) 0%, transparent 70%)' }} />
        <div className="absolute right-[-2%] top-[12%] h-[20rem] w-[20rem] rounded-full blur-[60px]" style={{ background: 'radial-gradient(circle, rgba(255,88,214,0.1) 0%, transparent 70%)' }} />
        <div className="absolute bottom-[-6%] left-[22%] h-[18rem] w-[18rem] rounded-full blur-[50px]" style={{ background: 'radial-gradient(circle, rgba(118,82,255,0.08) 0%, transparent 70%)' }} />
        <div className="absolute top-[45%] right-[20%] h-[12rem] w-[12rem] rounded-full blur-[40px]" style={{ background: 'radial-gradient(circle, rgba(0,255,255,0.05) 0%, transparent 70%)' }} />
      </div>

      <Navbar />
      <ScrollToTop />

      <main key={location.pathname} className="page-enter min-h-[calc(100vh-360px)]">
        <Outlet />
      </main>

      <Footer />

      <Toaster position="top-right" richColors closeButton theme="dark" />
    </div>
  );
}
