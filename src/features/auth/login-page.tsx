
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authService } from '../../services/auth.service';
import { useAuthStore } from '../../stores/auth.store';
import { Logo } from '../../components/ui/logo';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(1, "Mot de passe requis"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.login);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    setErrorMsg(null);
    try {
      const response = await authService.login(data.email, data.password);
      setAuth(response.user, response.token);
      
      // Redirect based on role
      if (response.user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/client');
      }
    } catch (error: unknown) {
      setErrorMsg((error as any).response?.data?.message || (error as any).message || 'Erreur de connexion.');
      console.error('Login error:', error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA] relative overflow-hidden">
      {/* Background patterns */}
      <div className="absolute inset-0 bg-[radial-gradient(#DEE2E6_1px,transparent_1px)] [background-size:32px_32px] opacity-40" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full bg-white border border-[#DEE2E6] rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-10 z-10 mx-4"
      >
        <div className="flex justify-center mb-10">
          <Logo className="h-9" />
        </div>

        <div className="text-center mb-10">
          <h1 className="text-2xl font-bold text-[#212529] tracking-tight mb-2">Bienvenue</h1>
          <p className="text-sm text-[#6C757D]">Connectez-vous à votre espace automatisé</p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-[#495057] ml-1">Email</label>
            <input
              type="email"
              {...register('email')}
              placeholder="votre@email.com"
              className={cn(
                "w-full bg-[#F8F9FA] border border-[#DEE2E6] text-[#212529] rounded-2xl px-4 py-3.5 outline-none transition-all focus:border-[#ADB5BD] focus:ring-4 focus:ring-[#ADB5BD]/10 placeholder:text-[#ADB5BD] text-sm",
                errors.email ? "border-red-300 focus:border-red-400 focus:ring-red-400/5" : ""
              )}
            />
            {errors.email && <span className="text-red-500 text-xs mt-1 ml-1 block">{errors.email.message}</span>}
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center ml-1">
              <label className="block text-sm font-semibold text-[#495057]">Mot de passe</label>
              <a href="#" className="text-xs text-[#6C757D] hover:text-[#212529] font-medium transition-colors">Oublié ?</a>
            </div>
            <input
              type="password"
              {...register('password')}
              placeholder="••••••••"
              className={cn(
                "w-full bg-[#F8F9FA] border border-[#DEE2E6] text-[#212529] rounded-2xl px-4 py-3.5 outline-none transition-all focus:border-[#ADB5BD] focus:ring-4 focus:ring-[#ADB5BD]/10 placeholder:text-[#ADB5BD] text-sm",
                errors.password ? "border-red-300 focus:border-red-400 focus:ring-red-400/5" : ""
              )}
            />
            {errors.password && <span className="text-red-500 text-xs mt-1 ml-1 block">{errors.password.message}</span>}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#343A40] hover:bg-[#212529] text-[#F8F9FA] font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 transform active:scale-[0.98] shadow-lg shadow-[#343A40]/10 disabled:opacity-70"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Connexion...</span>
              </>
            ) : (
              'Se connecter'
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
