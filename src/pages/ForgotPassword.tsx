import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Mail } from 'lucide-react';
import { AuthLayout } from '@/components/auth/AuthLayout';

const schema = z.object({
  email: z.string().email('Email inválido'),
});

type FormData = z.infer<typeof schema>;

export default function ForgotPassword() {
  const [isLoading, setIsLoading] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        toast.error('Erro ao enviar email. Tente novamente.');
      } else {
        toast.success('Email enviado! Verifique sua caixa de entrada para redefinir sua senha.');
        reset();
      }
    } catch {
      toast.error('Erro inesperado. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout title="Recuperar senha." subtitle="Digite seu email e enviaremos as instruções para criar uma nova senha.">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-sm font-semibold text-slate-700">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              id="email"
              type="email"
              placeholder="seu@email.com"
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl pl-11 pr-4 py-3 text-base focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:bg-white transition-all outline-none placeholder:text-slate-400"
              {...register('email')}
            />
          </div>
          {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="bg-orange-500 hover:bg-orange-600 text-white w-full py-4 rounded-xl font-bold text-lg shadow-md mt-6 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              Enviando...
            </span>
          ) : (
            'Enviar instruções'
          )}
        </button>

        <p className="w-full text-center mt-4 text-slate-500 font-medium text-sm">
          Lembrou a senha?{' '}
          <Link to="/login" className="text-orange-500 font-bold hover:text-orange-600 transition-colors">
            Voltar para o Login
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
