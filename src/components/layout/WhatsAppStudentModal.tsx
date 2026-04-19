import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, MessageCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface WhatsAppStudentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface StudentRow {
  id: string;
  name: string | null;
  photo_url: string | null;
  phone: string | null;
}

function digitsOnly(phone: string | null | undefined): string {
  return (phone || '').replace(/\D/g, '');
}

function buildWhatsAppUrl(phone: string | null | undefined): string {
  const digits = digitsOnly(phone);
  // Fallback placeholder if no phone is configured
  const target = digits || '5511999999999';
  return `https://wa.me/${target}`;
}

export function WhatsAppStudentModal({ open, onOpenChange }: WhatsAppStudentModalProps) {
  const { user } = useAuth();
  const [search, setSearch] = useState('');

  const { data: students = [], isLoading } = useQuery({
    queryKey: ['whatsapp-students', user?.id],
    queryFn: async (): Promise<StudentRow[]> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, photo_url, phone')
        .eq('business_owner_id', user!.id)
        .eq('role', 'student')
        .order('name');
      if (error) throw error;
      return (data || []) as StudentRow[];
    },
    enabled: !!user?.id && open,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) => (s.name || '').toLowerCase().includes(q));
  }, [students, search]);

  const handleOpenWhats = (student: StudentRow) => {
    window.open(buildWhatsAppUrl(student.phone), '_blank');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-green-500/10 text-green-600 flex items-center justify-center">
              <MessageCircle className="w-4 h-4" />
            </span>
            Falar com Aluno
          </DialogTitle>
        </DialogHeader>

        <div className="px-5 pb-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              placeholder="Buscar aluno por nome..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-secondary border-0"
            />
          </div>
        </div>

        <div className="max-h-[55vh] overflow-y-auto px-2 pb-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-6">Carregando...</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nenhum aluno encontrado.
            </p>
          ) : (
            <ul className="space-y-1">
              {filtered.map((student) => {
                const initials = (student.name || 'A')
                  .split(' ')
                  .slice(0, 2)
                  .map((p) => p.charAt(0))
                  .join('')
                  .toUpperCase();
                return (
                  <li key={student.id}>
                    <button
                      type="button"
                      onClick={() => handleOpenWhats(student)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary transition-colors text-left"
                    >
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={student.photo_url || undefined} />
                        <AvatarFallback className="bg-accent/15 text-accent text-sm font-semibold">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {student.name || 'Aluno'}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {student.phone || 'Sem telefone — usará número padrão'}
                        </p>
                      </div>
                      <span className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center shrink-0">
                        <MessageCircle className="w-4 h-4" />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
