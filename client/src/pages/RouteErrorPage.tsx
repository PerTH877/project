import { AlertTriangle, Home, RefreshCw } from "lucide-react";
import { Link, isRouteErrorResponse, useRouteError } from "react-router-dom";
import { ParuvoLogo } from "@/components/branding/ParuvoLogo";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PageShell } from "@/components/ui/Surface";

export default function RouteErrorPage() {
  const error = useRouteError();

  let title = "Route interrupted";
  let description = "This view hit an unexpected fault, but the marketplace shell is still recoverable.";
  let detail = "Reload the route or return to the marketplace to keep browsing.";
  let statusLabel = "Render fault";

  if (isRouteErrorResponse(error)) {
    statusLabel = `HTTP ${error.status}`;
    title = error.status === 404 ? "Route not found" : "Route request failed";
    description = error.statusText || description;
    if (typeof error.data === "string") {
      detail = error.data;
    } else if (error.data && typeof error.data === "object" && "error" in error.data) {
      detail = String(error.data.error);
    }
  } else if (error instanceof Error) {
    detail = error.message || detail;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[-6%] top-[10%] h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute right-[-4%] top-[18%] h-[28rem] w-[28rem] rounded-full bg-fuchsia-500/9 blur-3xl" />
        <div className="absolute bottom-[-16%] left-[26%] h-[30rem] w-[30rem] rounded-full bg-violet-400/8 blur-3xl" />
      </div>

      <PageShell className="flex min-h-screen items-center py-16">
        <div className="mx-auto w-full max-w-3xl hud-panel p-7 sm:p-10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <ParuvoLogo />
            <StatusBadge label={statusLabel} tone="rose" />
          </div>

          <div className="mt-10 inline-flex items-center gap-3 rounded-[20px] border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-rose-200">
            <AlertTriangle className="h-5 w-5" />
            Route safety boundary engaged
          </div>

          <h1 className="mt-6 display-font text-3xl font-semibold text-white sm:text-4xl">{title}</h1>
          <p className="mt-4 max-w-2xl text-sm leading-8 text-slate-300">{description}</p>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">{detail}</p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[20px] border border-white/10 bg-[#070c14]/72 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-muted-foreground">
                Recovery
              </p>
              <p className="mt-2 text-sm text-white">Reload just this route boundary without leaving the app.</p>
            </div>
            <div className="rounded-[20px] border border-white/10 bg-[#070c14]/72 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-muted-foreground">
                Safe fallback
              </p>
              <p className="mt-2 text-sm text-white">Return to the homepage and continue browsing verified listings.</p>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <button onClick={() => window.location.reload()} className="action-primary">
              <RefreshCw className="h-4 w-4" />
              Reload route
            </button>
            <Link to="/" className="action-secondary">
              <Home className="h-4 w-4" />
              Back to marketplace
            </Link>
          </div>
        </div>
      </PageShell>
    </div>
  );
}
