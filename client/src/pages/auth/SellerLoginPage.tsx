import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { AlertCircle, Store, User } from "lucide-react";
import { toast } from "sonner";
import { authService } from "@/services/auth";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";
import { AuthShell } from "@/components/branding/AuthShell";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function SellerLoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const [loading, setLoading] = useState(false);
  const [unverifiedError, setUnverifiedError] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    setUnverifiedError(false);
    try {
      const token = await authService.sellerLogin(data.email, data.password);
      login(token);
      toast.success("Seller account ready");
      navigate("/seller/dashboard");
    } catch (error: any) {
      if (error.response?.status === 403) {
        setUnverifiedError(true);
      } else {
        toast.error(error.response?.data?.error || "Could not sign you in");
      }
    } finally {
      setLoading(false);
    }
  };

  if (unverifiedError) {
    return (
      <AuthShell
        badge="Seller review"
        title="Your seller application is still under review."
        description="You can sign in after the admin team verifies your store details."
        asideTitle="What happens next?"
        asideDescription="The review checks store identity, trade details, and account readiness. Once approved, your dashboard becomes available right away."
        asidePoints={["Manual review", "Email contact", "Dashboard unlock"]}
      >
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-400/25 bg-amber-400/10 text-amber-200">
            <AlertCircle className="h-8 w-8" />
          </div>
          <h2 className="mt-5 text-3xl font-semibold text-white">Verification pending</h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            Your seller account is registered, but it is not active yet. Check back after approval.
          </p>
          <button onClick={() => setUnverifiedError(false)} className="action-secondary mt-6">
            Return to seller sign in
          </button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      badge="Seller sign in"
      title="Run your store from one clean workspace."
      description="Manage listings, stock, orders, and sales trends without leaving the same merchant account."
      asideTitle="What you get"
      asideDescription="Seller access includes product management, low-stock tracking, warehouse distribution, and sales reporting."
      asidePoints={["Product management", "Stock alerts", "Sales analytics"]}
    >
      <div className="mb-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary shadow-cyan">
          <Store className="h-6 w-6" />
        </div>
        <h2 className="mt-5 text-3xl font-semibold text-white">Seller workspace</h2>
        <p className="mt-2 text-sm text-muted-foreground">Sign in to manage your store.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="field-label">Business email</label>
          <input
            type="email"
            {...register("email")}
            placeholder="store@example.com"
            className={cn("field-input", errors.email ? "border-rose-400/45" : "")}
          />
          {errors.email ? <p className="mt-2 text-xs text-rose-300">{errors.email.message}</p> : null}
        </div>

        <div>
          <label className="field-label">Password</label>
          <input
            type="password"
            {...register("password")}
            placeholder="Enter your password"
            className={cn("field-input", errors.password ? "border-rose-400/45" : "")}
          />
          {errors.password ? <p className="mt-2 text-xs text-rose-300">{errors.password.message}</p> : null}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="action-primary mt-3 w-full justify-center disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" /> : "Sign in as seller"}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-muted-foreground">
        Need a seller account?{" "}
        <Link to="/seller/register" className="font-semibold text-primary hover:text-white">
          Apply to sell
        </Link>
      </div>

      <div className="mt-8 border-t border-white/8 pt-6">
        <Link to="/login" className="action-secondary w-full justify-center rounded-2xl">
          <User className="h-4 w-4" />
          Use a customer account instead
        </Link>
      </div>
    </AuthShell>
  );
}
