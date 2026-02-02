// Time slots available for booking
export const TIME_SLOTS = [
  { id: '09:00', label: '09:00 - 10:00', period: 'morning' },
  { id: '10:00', label: '10:00 - 11:00', period: 'morning' },
  { id: '11:00', label: '11:00 - 12:00', period: 'morning' },
  { id: '16:00', label: '16:00 - 17:00', period: 'afternoon' },
  { id: '17:00', label: '17:00 - 18:00', period: 'afternoon' },
  { id: '18:00', label: '18:00 - 19:00', period: 'evening' },
  { id: '19:00', label: '19:00 - 20:00', period: 'evening' },
] as const;

// Maximum students per slot
export const MAX_STUDENTS_PER_SLOT = 4;

// Booking constraints (in hours)
export const BOOKING_DEADLINE_HOURS = 2;
export const CANCELLATION_DEADLINE_HOURS = 1;

// Rolling window for booking (in days)
export const BOOKING_WINDOW_DAYS = 31;

// Status labels in Portuguese
export const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  delegated: 'Delegado',
  completed: 'Concluído',
  cancelled: 'Cancelado',
  rejected: 'Recusado',
};

// Role labels in Portuguese
export const ROLE_LABELS: Record<string, string> = {
  student: 'Aluno',
  admin: 'Administrador',
  collaborator: 'Colaborador',
};

// Days of week in Portuguese (0 = Sunday)
export const DAYS_OF_WEEK = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];

// Months in Portuguese
export const MONTHS = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];
