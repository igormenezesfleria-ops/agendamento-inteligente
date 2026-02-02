import { AuthLayout } from '@/components/auth/AuthLayout';
import { SignupForm } from '@/components/auth/SignupForm';

export default function Signup() {
  return (
    <AuthLayout
      title="Criar sua conta"
      subtitle="Cadastre-se para começar a agendar seus treinos"
    >
      <SignupForm />
    </AuthLayout>
  );
}
