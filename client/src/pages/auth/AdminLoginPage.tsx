import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Shield } from "lucide-react";
import { toast } from "sonner";
import { authService } from "@/services/auth";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";
import { AuthShell } from "@/components/branding/AuthShell";

const loginSchema = z.object({
  email: z.string().email("Enter a valid admin email"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const [loading, setLoading] = useState(false);

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
      const token = await authService.adminLogin(data.email, data.password);
      login(token);
      toast.success("Admin access granted");
      navigate("/admin/dashboard");
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Could not sign you in");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      badge="Admin sign in"
      title="Review the marketplace with full operational context."
      description="Seller performance, demand gaps, warehouse pressure, and return risk all start from the admin console."
      asideTitle="Restricted access"
      asideDescription="This portal is for marketplace operations only. Customer and seller actions remain separated from admin access."
      asidePoints={["Marketplace health", "Seller moderation", "Risk tracking"]}
    >
      <div className="mb-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-violet-400/25 bg-violet-400/10 text-violet-200">
          <Shield className="h-6 w-6" />
        </div>
        <h2 className="mt-5 text-3xl font-semibold text-white">Admin console</h2>
        <p className="mt-2 text-sm text-muted-foreground">Sign in with the configured admin account.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="field-label">Admin email</label>
          <input
            type="email"
            {...register("email")}
            placeholder="admin@paruvo.com"
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
          {loading ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" /> : "Enter admin console"}
        </button>
      </form>
    </AuthShell>
  );
}

