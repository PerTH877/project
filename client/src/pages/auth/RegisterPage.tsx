import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import { authService } from "@/services/auth";
import { warehousesService } from "@/services/products";
import { cn } from "@/lib/utils";
import { AuthShell } from "@/components/branding/AuthShell";

const registerSchema = z.object({
  full_name: z.string().min(2, "Enter your full name"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Use at least 6 characters"),
  phone_number: z.string().optional(),
  nearby_warehouse_id: z.coerce.number().optional().nullable(),
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const { data: warehouses = [] } = useQuery({
    queryKey: ["warehouses"],
    queryFn: warehousesService.list,
  });

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
      await authService.userRegister({
        ...data,
        nearby_warehouse_id: data.nearby_warehouse_id || undefined,
      });
      toast.success("Account created. You can sign in now.");
      navigate("/login");
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Could not create your account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      badge="Create account"
      title="Start shopping with a local delivery profile."
      description="Save addresses, keep wishlists, and check out faster with the warehouse city that suits you best."
      asideTitle="Why set a nearby warehouse?"
      asideDescription="It helps PARUVO show inventory and dispatch coverage that make more sense for your area."
      asidePoints={["Saved addresses", "Wishlist sync", "Local stock view"]}
    >
      <div className="mb-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary shadow-cyan">
          <UserPlus className="h-6 w-6" />
        </div>
        <h2 className="mt-5 text-3xl font-semibold text-white">Create your account</h2>
        <p className="mt-2 text-sm text-muted-foreground">Set up a buyer profile in a minute.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="field-label">Full name</label>
          <input
            type="text"
            {...register("full_name")}
            placeholder="Anika Rahman"
            className={cn("field-input", errors.full_name ? "border-rose-400/45" : "")}
          />
          {errors.full_name ? <p className="mt-2 text-xs text-rose-300">{errors.full_name.message}</p> : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="field-label">Email</label>
            <input
              type="email"
              {...register("email")}
              placeholder="anika@example.com"
              className={cn("field-input", errors.email ? "border-rose-400/45" : "")}
            />
            {errors.email ? <p className="mt-2 text-xs text-rose-300">{errors.email.message}</p> : null}
          </div>
          <div>
            <label className="field-label">Phone number</label>
            <input
              type="tel"
              {...register("phone_number")}
              placeholder="+880 1711 001100"
              className="field-input"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
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
          <div>
            <label className="field-label">Nearby warehouse</label>
            <select {...register("nearby_warehouse_id")} className="field-select">
              <option value="">Choose later</option>
              {warehouses.map((warehouse) => (
                <option key={warehouse.warehouse_id} value={warehouse.warehouse_id}>
                  {warehouse.name} ({warehouse.city})
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="action-primary mt-3 w-full justify-center disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" /> : "Create account"}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-muted-foreground">
        Already registered?{" "}
        <Link to="/login" className="font-semibold text-primary hover:text-white">
          Sign in
        </Link>
      </div>
    </AuthShell>
  );
}

