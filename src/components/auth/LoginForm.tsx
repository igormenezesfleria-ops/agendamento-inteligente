import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Mail, Lock } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const { error } = await signIn(data.email, data.password);
      
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast.error('Email ou senha incorretos');
        } else if (error.message.includes('Email not confirmed')) {
          toast.error('Por favor, confirme seu email antes de fazer login');
        } else {
          toast.error('Erro ao fazer login. Tente novamente.');
        }
        return;
      }

      // Fetch user profile to determine role-based redirect
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        toast.success('Login realizado com sucesso!');

        // Redirect based on role
        const role = profile?.role || 'student';
        switch (role) {
          case 'admin':
            navigate('/dashboard/admin');
            break;
          case 'collaborator':
            navigate('/dashboard/collaborator');
            break;
          default:
            navigate('/dashboard/student');
        }
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      toast.error('Erro inesperado. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Email */}
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
        {errors.email && (
          <p className="text-sm text-red-500">{errors.email.message}</p>
        )}
      </div>

      {/* Password */}
      <div className="space-y-1.5">
        <Label htmlFor="password" className="text-sm font-semibold text-slate-700">Senha</Label>
        <div className="relative">
          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            id="password"
            type="password"
            placeholder="••••••••"
            className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl pl-11 pr-4 py-3 text-base focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:bg-white transition-all outline-none placeholder:text-slate-400"
            {...register('password')}
          />
        </div>
        {errors.password && (
          <p className="text-sm text-red-500">{errors.password.message}</p>
        )}
        <Link
          to="/esqueci-senha"
          className="text-sm text-orange-500 font-semibold hover:text-orange-600 w-full text-right block mt-2 cursor-pointer transition-colors"
        >
          Esqueceu a senha?
        </Link>
      </div>

      {/* CTA */}
      <button
        type="submit"
        disabled={isLoading}
        className="bg-orange-500 hover:bg-orange-600 text-white w-full py-4 rounded-xl font-bold text-lg shadow-md mt-6 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            Entrando...
          </span>
        ) : (
          'Entrar'
        )}
      </button>

      {/* Footer */}
      <p className="w-full text-center mt-4 text-slate-500 font-medium text-sm">
        Não tem uma conta?{' '}
        <Link to="/cadastro" className="text-orange-500 font-bold hover:text-orange-600 transition-colors">
          Cadastre-se
        </Link>
      </p>
    </form>
  );
}
