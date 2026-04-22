import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Mail, Lock, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const signupSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').max(100, 'Nome muito longo'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
});

type SignupFormData = z.infer<typeof signupSchema>;

export function SignupForm() {
  const [isLoading, setIsLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors } } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = async (data: SignupFormData) => {
    setIsLoading(true);
    try {
      const { error } = await signUp(data.email, data.password, data.name, 'admin');
      
      if (error) {
        if (
          error.message.includes('already registered') ||
          error.message.includes('User already registered') ||
          error.message.includes('already exists') ||
          error.message.toLowerCase().includes('duplicate')
        ) {
          toast.error('Este email já está cadastrado. Tente fazer login ou use outro email.');
        } else if (error.message.includes('Password')) {
          toast.error('A senha não atende aos requisitos mínimos.');
        } else if (error.message.includes('email')) {
          toast.error('Email inválido. Verifique e tente novamente.');
        } else {
          toast.error('Erro ao criar conta. Tente novamente.');
        }
        return;
      }

      toast.success('Conta criada! Verifique seu email para confirmar o cadastro.');
      navigate('/login');
    } catch (err) {
      toast.error('Erro inesperado. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Info banner */}
      <div className="rounded-xl bg-orange-500/10 border border-orange-500/30 p-4">
        <p className="text-xs text-gray-300 leading-relaxed">
          <span className="font-semibold text-orange-500">Cadastro exclusivo para Personal / Studio.</span>{' '}
          Alunos recebem o convite por e-mail enviado pelo seu personal.
        </p>
      </div>

      {/* Name */}
      <div className="space-y-1.5">
        <Label htmlFor="name" className="text-sm font-semibold text-gray-300">Nome Completo</Label>
        <div className="relative">
          <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            id="name"
            type="text"
            placeholder="Seu nome"
            className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-xl pl-11 pr-4 py-3 text-base focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 transition-all outline-none placeholder:text-gray-500"
            {...register('name')}
          />
        </div>
        {errors.name && (
          <p className="text-sm text-red-400">{errors.name.message}</p>
        )}
      </div>

      {/* Email */}
      <div className="space-y-1.5">
        <Label htmlFor="email" className="text-sm font-semibold text-gray-300">Email</Label>
        <div className="relative">
          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            id="email"
            type="email"
            placeholder="seu@email.com"
            className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-xl pl-11 pr-4 py-3 text-base focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 transition-all outline-none placeholder:text-gray-500"
            {...register('email')}
          />
        </div>
        {errors.email && (
          <p className="text-sm text-red-400">{errors.email.message}</p>
        )}
      </div>

      {/* Password */}
      <div className="space-y-1.5">
        <Label htmlFor="password" className="text-sm font-semibold text-gray-300">Senha</Label>
        <div className="relative">
          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            id="password"
            type="password"
            placeholder="••••••••"
            className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-xl pl-11 pr-4 py-3 text-base focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 transition-all outline-none placeholder:text-gray-500"
            {...register('password')}
          />
        </div>
        {errors.password && (
          <p className="text-sm text-red-400">{errors.password.message}</p>
        )}
      </div>

      {/* Confirm Password */}
      <div className="space-y-1.5">
        <Label htmlFor="confirmPassword" className="text-sm font-semibold text-gray-300">Confirmar Senha</Label>
        <div className="relative">
          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            id="confirmPassword"
            type="password"
            placeholder="••••••••"
            className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-xl pl-11 pr-4 py-3 text-base focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 transition-all outline-none placeholder:text-gray-500"
            {...register('confirmPassword')}
          />
        </div>
        {errors.confirmPassword && (
          <p className="text-sm text-red-400">{errors.confirmPassword.message}</p>
        )}
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
            Criando conta...
          </span>
        ) : (
          'Criar Conta'
        )}
      </button>

      {/* Footer */}
      <p className="w-full text-center mt-4 text-gray-400 font-medium text-sm">
        Já tem uma conta?{' '}
        <Link to="/login" className="text-orange-500 font-bold hover:text-orange-400 transition-colors">
          Entrar
        </Link>
      </p>
    </form>
  );
}
