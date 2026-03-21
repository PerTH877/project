import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Shield, Store, User } from "lucide-react";
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

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((state) => state.login);
  const [loading, setLoading] = useState(false);
  const from = location.state?.from || "/";

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    try {
      const token = await authService.userLogin(data.email, data.password);
      login(token);
      toast.success("Signed in");
      navigate(from, { replace: true });
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Could not sign you in");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      badge="Customer sign in"
      title="Pick up where you left off."
      description="Access your orders, saved products, delivery addresses, and checkout history in one place."
      asideTitle="Built for everyday buying"
      asideDescription="PARUVO keeps search, pricing, and delivery details clear, whether you are buying from Dhaka, Chattogram, Rajshahi, or beyond."
      asidePoints={["Fast checkout", "BDT pricing", "Order tracking"]}
    >
      <div className="mb-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary shadow-cyan">
          <User className="h-6 w-6" />
        </div>
        <h2 className="mt-5 text-3xl font-semibold text-white">Customer account</h2>
        <p className="mt-2 text-sm text-muted-foreground">Sign in to continue shopping.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="field-label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            {...register("email")}
            placeholder="name@example.com"
            className={cn("field-input", errors.email ? "border-rose-400/45" : "")}
          />
          {errors.email ? <p className="mt-2 text-xs text-rose-300">{errors.email.message}</p> : null}
        </div>

        <div>
          <label className="field-label" htmlFor="password">
            Password
          </label>
          <input
            id="password"
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
          {loading ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" /> : "Sign in"}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-muted-foreground">
        New to PARUVO?{" "}
        <Link to="/register" className="font-semibold text-primary hover:text-white">
          Create an account
        </Link>
      </div>

      <div className="mt-8 border-t border-white/8 pt-6">
        <p className="text-center text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
          Other access
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Link to="/seller/login" className="action-secondary w-full justify-center rounded-2xl">
            <Store className="h-4 w-4" />
            Seller sign in
          </Link>
          <Link to="/admin/login" className="action-secondary w-full justify-center rounded-2xl">
            <Shield className="h-4 w-4" />
            Admin sign in
          </Link>
        </div>
      </div>
    </AuthShell>
  );
}

