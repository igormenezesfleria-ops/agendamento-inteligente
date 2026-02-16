import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Mail, Lock, User, Dumbbell, GraduationCap } from 'lucide-react';
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
type SelectedRole = 'admin' | 'student';

export function SignupForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<SelectedRole | null>(null);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors } } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = async (data: SignupFormData) => {
    if (!selectedRole) {
      toast.error('Selecione seu perfil antes de continuar.');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await signUp(data.email, data.password, data.name, selectedRole);
      
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Role Selection */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">Qual é o seu perfil?</Label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setSelectedRole('admin')}
            className={cn(
              'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200',
              selectedRole === 'admin'
                ? 'border-accent bg-accent/10 shadow-md'
                : 'border-border bg-card hover:border-accent/50 hover:bg-accent/5'
            )}
          >
            <div className={cn(
              'w-12 h-12 rounded-xl flex items-center justify-center transition-colors',
              selectedRole === 'admin' ? 'accent-gradient' : 'bg-muted'
            )}>
              <Dumbbell className={cn(
                'w-6 h-6',
                selectedRole === 'admin' ? 'text-accent-foreground' : 'text-muted-foreground'
              )} />
            </div>
            <span className={cn(
              'font-semibold text-sm',
              selectedRole === 'admin' ? 'text-accent' : 'text-foreground'
            )}>
              Sou Personal / Studio
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedRole('student')}
            className={cn(
              'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200',
              selectedRole === 'student'
                ? 'border-accent bg-accent/10 shadow-md'
                : 'border-border bg-card hover:border-accent/50 hover:bg-accent/5'
            )}
          >
            <div className={cn(
              'w-12 h-12 rounded-xl flex items-center justify-center transition-colors',
              selectedRole === 'student' ? 'accent-gradient' : 'bg-muted'
            )}>
              <GraduationCap className={cn(
                'w-6 h-6',
                selectedRole === 'student' ? 'text-accent-foreground' : 'text-muted-foreground'
              )} />
            </div>
            <span className={cn(
              'font-semibold text-sm',
              selectedRole === 'student' ? 'text-accent' : 'text-foreground'
            )}>
              Sou Aluno
            </span>
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Nome Completo</Label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            id="name"
            type="text"
            placeholder="Seu nome"
            className="pl-10"
            {...register('name')}
          />
        </div>
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            placeholder="seu@email.com"
            className="pl-10"
            {...register('email')}
          />
        </div>
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Senha</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            className="pl-10"
            {...register('password')}
          />
        </div>
        {errors.password && (
          <p className="text-sm text-destructive">{errors.password.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirmar Senha</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            id="confirmPassword"
            type="password"
            placeholder="••••••••"
            className="pl-10"
            {...register('confirmPassword')}
          />
        </div>
        {errors.confirmPassword && (
          <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
        )}
      </div>

      <Button type="submit" variant="accent" size="lg" className="w-full" disabled={isLoading || !selectedRole}>
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Criando conta...
          </>
        ) : (
          'Criar Conta'
        )}
      </Button>

      <p className="text-center text-muted-foreground">
        Já tem uma conta?{' '}
        <Link to="/login" className="text-accent hover:underline font-medium">
          Entrar
        </Link>
      </p>
    </form>
  );
}
