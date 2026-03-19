import { AuthLayout } from '@/components/auth/AuthLayout';
import { SignupForm } from '@/components/auth/SignupForm';

export default function Signup() {
  return (
    <AuthLayout
      title="Crie sua conta."
      subtitle="Cadastre-se para iniciar sua jornada."
    >
      <SignupForm />
    </AuthLayout>
  );
}
