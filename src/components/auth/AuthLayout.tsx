import { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle: string;
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-[#101318] flex flex-col">
      <div className="flex-1 flex flex-col justify-center px-6 py-10 sm:px-8 lg:px-16">
        <div className="w-full max-w-md mx-auto">
          {/* Signature symbol — isolated S */}
          <Link to="/" className="flex justify-center mb-6 group">
            <img
              src="/logo-synton-symbol.png"
              alt="Synton"
              className="h-16 w-auto object-contain bg-transparent group-hover:scale-105 transition-transform"
            />
          </Link>

          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-extrabold text-white mt-4">{title}</h1>
            <p className="text-gray-400 mt-2">{subtitle}</p>
          </div>

          {/* Form content */}
          {children}
        </div>
      </div>
    </div>
  );
}
