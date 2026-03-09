import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ClipboardList } from 'lucide-react';

const OBJECTIVES = [
  { value: 'emagrecimento', label: 'Emagrecimento' },
  { value: 'hipertrofia', label: 'Hipertrofia' },
  { value: 'saude', label: 'Saúde / Condicionamento' },
  { value: 'reabilitacao', label: 'Reabilitação' },
  { value: 'alta_performance', label: 'Alta Performance' },
];

interface TriageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TriageModal({ open, onOpenChange }: TriageModalProps) {
  const { user, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState<'welcome' | 'form'>('welcome');
  const [saving, setSaving] = useState(false);

  const [phone, setPhone] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [objective, setObjective] = useState('');
  const [hasInjury, setHasInjury] = useState(false);
  const [injuryDetails, setInjuryDetails] = useState('');
  const [isActivePhysical, setIsActivePhysical] = useState(false);
  const [height, setHeight] = useState('');
  const [birthDate, setBirthDate] = useState('');

  const formatBirthDate = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 8);
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  };

  const handleSubmit = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        phone: phone.trim() || null,
        emergency_contact: emergencyContact.trim() || null,
        main_objective: objective || null,
        has_injury: hasInjury,
        injury_details: hasInjury ? injuryDetails.trim() || null : null,
        is_active: isActivePhysical,
        profile_completed: true,
      })
      .eq('id', user.id);

    setSaving(false);

    if (error) {
      toast({ title: 'Erro', description: 'Não foi possível salvar. Tente novamente.', variant: 'destructive' });
      return;
    }

    toast({ title: '✅ Perfil completo!', description: 'Seu personal já pode preparar seu treino.' });
    await refreshProfile();
    onOpenChange(false);
  };

  const handleClose = () => {
    setStep('welcome');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        {step === 'welcome' ? (
          <>
            <DialogHeader>
              <div className="flex justify-center mb-2">
                <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center">
                  <ClipboardList className="w-7 h-7 text-accent" />
                </div>
              </div>
              <DialogTitle className="text-center text-xl">
                Bem-vindo! 👋
              </DialogTitle>
              <DialogDescription className="text-center">
                Vamos completar seu perfil para o Personal preparar o seu treino.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-3 mt-4">
              <Button
                variant="accent"
                size="lg"
                className="w-full"
                onClick={() => setStep('form')}
              >
                Completar Agora
              </Button>
              <Button
                variant="ghost"
                size="lg"
                className="w-full text-muted-foreground"
                onClick={handleClose}
              >
                Responder Depois
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Ficha de Triagem</DialogTitle>
              <DialogDescription>
                Preencha os dados abaixo para seu personal montar o treino ideal.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-5 mt-2">
              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone / WhatsApp</Label>
                <Input
                  id="phone"
                  placeholder="(11) 99999-9999"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  maxLength={20}
                />
              </div>

              {/* Emergency Contact */}
              <div className="space-y-2">
                <Label htmlFor="emergency">Contato de Emergência - Nome e Fone</Label>
                <Input
                  id="emergency"
                  placeholder="Maria - (11) 98888-8888"
                  value={emergencyContact}
                  onChange={(e) => setEmergencyContact(e.target.value)}
                  maxLength={100}
                />
              </div>

              {/* Objective */}
              <div className="space-y-2">
                <Label>Objetivo Principal</Label>
                <Select value={objective} onValueChange={setObjective}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione seu objetivo" />
                  </SelectTrigger>
                  <SelectContent>
                    {OBJECTIVES.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Injury */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="injury">Possui alguma lesão, dor ou limitação?</Label>
                  <Switch id="injury" checked={hasInjury} onCheckedChange={setHasInjury} />
                </div>
                {hasInjury && (
                  <Textarea
                    placeholder="Por favor, descreva sua lesão ou limitação..."
                    value={injuryDetails}
                    onChange={(e) => setInjuryDetails(e.target.value)}
                    maxLength={500}
                    className="animate-fade-in"
                  />
                )}
              </div>

              {/* Currently Active */}
              <div className="flex items-center justify-between">
                <Label htmlFor="active">Pratica atividade física atualmente?</Label>
                <Switch id="active" checked={isActivePhysical} onCheckedChange={setIsActivePhysical} />
              </div>

              {/* Submit */}
              <Button
                variant="accent"
                size="lg"
                className="w-full"
                onClick={handleSubmit}
                disabled={saving}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Salvar Ficha
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
