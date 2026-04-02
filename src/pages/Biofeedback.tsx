import { useLocation } from 'react-router-dom';
import { BiofeedbackCamera } from '@/components/student/BiofeedbackCamera';

export default function Biofeedback() {
  const location = useLocation();
  const state = location.state as {
    movementPattern?: string;
    selectedErrors?: string[];
    exerciseName?: string;
  } | null;

  return (
    <BiofeedbackCamera
      movementPattern={state?.movementPattern ?? undefined}
      selectedErrors={state?.selectedErrors ?? undefined}
      exerciseName={state?.exerciseName ?? undefined}
    />
  );
}
