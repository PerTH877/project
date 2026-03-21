import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Store } from "lucide-react";
import { toast } from "sonner";
import { authService } from "@/services/auth";
import { cn } from "@/lib/utils";
import { AuthShell } from "@/components/branding/AuthShell";

const registerSchema = z.object({
  company_name: z.string().min(2, "Enter your store name"),
  contact_email: z.string().email("Enter a valid business email"),
  password: z.string().min(6, "Use at least 6 characters"),
  gst_number: z.string().optional(),
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function SellerRegisterPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterForm) => {
    setLoading(true);
    try {
      await authService.sellerRegister({
        ...data,
        gst_number: data.gst_number || undefined,
      });
      toast.success("Application submitted. We will review your store before activation.", {
        duration: 7000,
      });
      navigate("/seller/login");
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Could not submit your application");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      badge="Seller application"
      title="Open your store on PARUVO."
      description="Join a Bangladesh-ready marketplace with catalog tools, order visibility, and warehouse-aware inventory."
      asideTitle="Before you apply"
      asideDescription="Use a real business email and add your trade or tax registration when available. The review team uses those details during verification."
      asidePoints={["Manual approval", "Seller analytics", "Warehouse inventory"]}
    >
      <div className="mb-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary shadow-cyan">
          <Store className="h-6 w-6" />
        </div>
        <h2 className="mt-5 text-3xl font-semibold text-white">Seller application</h2>
        <p className="mt-2 text-sm text-muted-foreground">Tell us about your store.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="field-label">Store or company name</label>
          <input
            type="text"
            {...register("company_name")}
            placeholder="Paragon Tech BD"
            className={cn("field-input", errors.company_name ? "border-rose-400/45" : "")}
          />
          {errors.company_name ? (
            <p className="mt-2 text-xs text-rose-300">{errors.company_name.message}</p>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="field-label">Business email</label>
            <input
              type="email"
              {...register("contact_email")}
              placeholder="owner@store.com"
              className={cn("field-input", errors.contact_email ? "border-rose-400/45" : "")}
            />
            {errors.contact_email ? (
              <p className="mt-2 text-xs text-rose-300">{errors.contact_email.message}</p>
            ) : null}
          </div>
          <div>
            <label className="field-label">Trade or tax ID</label>
            <input
              type="text"
              {...register("gst_number")}
              placeholder="TRADE-DHK-4421"
              className="field-input"
            />
          </div>
        </div>

        <div>
          <label className="field-label">Password</label>
          <input
            type="password"
            {...register("password")}
            placeholder="Create a password"
            className={cn("field-input", errors.password ? "border-rose-400/45" : "")}
          />
          {errors.password ? <p className="mt-2 text-xs text-rose-300">{errors.password.message}</p> : null}
        </div>

        <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4 text-sm leading-7 text-muted-foreground">
          Your seller account stays pending until an admin verifies it. After approval, you can sign in and start managing products right away.
        </div>

        <button
          type="submit"
          disabled={loading}
          className="action-primary mt-3 w-full justify-center disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" /> : "Submit application"}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-muted-foreground">
        Already applied?{" "}
        <Link to="/seller/login" className="font-semibold text-primary hover:text-white">
          Check your seller sign in
        </Link>
      </div>
    </AuthShell>
  );
}

