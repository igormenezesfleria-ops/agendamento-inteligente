import { AuthLayout } from '@/components/auth/AuthLayout';
import { LoginForm } from '@/components/auth/LoginForm';

export default function Login() {
  return (
    <AuthLayout
      title="Bem-vindo de volta."
      subtitle="Acesse sua conta para continuar."
    >
      <LoginForm />
    </AuthLayout>
  );
}
