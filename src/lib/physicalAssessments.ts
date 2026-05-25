export type AssessmentInput = {
  name: string;
  label: string;
  type: 'number' | 'text';
  unit?: string;
  step?: number;
  placeholder?: string;
};

export type AssessmentTest = {
  id: string;
  category: string;
  title: string;
  instructions: string;
  reference: string;
  inputs: AssessmentInput[];
};

export const PHYSICAL_ASSESSMENTS: AssessmentTest[] = [
  {
    id: 'handgrip',
    category: 'Força e Dinâmica',
    title: 'Preensão Manual (Handgrip)',
    reference: 'EWGSOP2 / ACSM',
    instructions:
      '**Protocolo:** Aluno sentado, cotovelo a 90°, braço aderido ao tronco.\n\n' +
      '1. Realize **3 tentativas** em cada mão, alternando os lados.\n' +
      '2. Registre o **maior valor** de cada mão (kg).\n\n' +
      '**Pontos de corte (EWGSOP2):** Homens < 27kg / Mulheres < 16kg indicam baixa força (sarcopenia).',
    inputs: [
      { name: 'rightLimb', label: 'Mão Direita (kg)', type: 'number', step: 0.1, unit: 'kg' },
      { name: 'leftLimb', label: 'Mão Esquerda (kg)', type: 'number', step: 0.1, unit: 'kg' },
    ],
  },
  {
    id: 'load_cell_asymmetry',
    category: 'Força e Dinâmica',
    title: 'Célula de Carga — Assimetria Isométrica',
    reference: 'Bishop et al. (2018) — LSI',
    instructions:
      '**Protocolo:** Posicione a célula de carga conforme o movimento avaliado (ex.: extensão de joelho isométrica a 60°).\n\n' +
      '1. Aluno realiza **contração máxima voluntária** de 3 a 5 segundos em cada lado.\n' +
      '2. Registre o **pico de força** (kg ou N) de cada lado.\n\n' +
      '**Cálculo:** LSI% = (Lado mais fraco / Lado mais forte) × 100.\n' +
      '**Risco:** Assimetria > 10–15% indica desequilíbrio e maior risco de lesão.',
    inputs: [
      { name: 'rightForce', label: 'Força Direita', type: 'number', step: 0.1, unit: 'kg' },
      { name: 'leftForce', label: 'Força Esquerda', type: 'number', step: 0.1, unit: 'kg' },
    ],
  },
  {
    id: 'calf_circumference',
    category: 'Sarcopenia',
    title: 'Circunferência da Panturrilha',
    reference: 'EWGSOP2',
    instructions:
      '**Protocolo:** Aluno sentado, joelho flexionado a 90°, pé apoiado no chão.\n\n' +
      '1. Meça a panturrilha no **ponto de maior perímetro** com fita métrica inelástica.\n' +
      '2. Registre o valor em **centímetros**.\n\n' +
      '**Alerta:** Valores **< 31 cm** indicam risco de sarcopenia.',
    inputs: [
      { name: 'circumference', label: 'Circunferência (cm)', type: 'number', step: 0.1, unit: 'cm' },
    ],
  },
  {
    id: 'tug',
    category: 'Cardiorrespiratório',
    title: 'Timed Up and Go (TUG)',
    reference: 'Podsiadlo & Richardson (1991)',
    instructions:
      '**Protocolo:** Aluno sentado em cadeira com apoio (≈ 46 cm de altura), demarcar 3 metros à frente.\n\n' +
      '1. Ao comando, o aluno **levanta**, caminha **3 m**, retorna e senta novamente.\n' +
      '2. Cronometre desde o sinal até o aluno sentar.\n\n' +
      '**Classificação:** < 10s = Normal · 10–12s = Atenção · > 12s = Risco de quedas.',
    inputs: [
      { name: 'timeSeconds', label: 'Tempo (segundos)', type: 'number', step: 0.1, unit: 's' },
    ],
  },
  {
    id: 'cmj',
    category: 'Potência',
    title: 'Salto Vertical (CMJ)',
    reference: 'Sargent Jump Test',
    instructions:
      '**Protocolo:** Junto a uma parede demarcada.\n\n' +
      '1. **Alcance Parado:** aluno em pé, braço estendido, marque o ponto mais alto tocado.\n' +
      '2. **Alcance Saltando:** com contramovimento (CMJ), o aluno salta e toca o ponto mais alto.\n' +
      '3. Registre 3 tentativas e considere a **melhor**.\n\n' +
      '**Cálculo:** Altura do salto (cm) = Alcance Saltando − Alcance Parado.',
    inputs: [
      { name: 'standReach', label: 'Alcance Parado (cm)', type: 'number', step: 0.1, unit: 'cm' },
      { name: 'jumpReach', label: 'Alcance Saltando (cm)', type: 'number', step: 0.1, unit: 'cm' },
    ],
  },
  {
    id: 'walk_6min',
    category: 'Cardiorrespiratório',
    title: 'Teste de Caminhada de 6 Minutos (TC6)',
    reference: 'ATS Guidelines (2002)',
    instructions:
      '**Protocolo:** Percurso plano de 30 m, demarcado a cada 3 m.\n\n' +
      '1. Aluno caminha o **mais rápido possível** (sem correr) por **6 minutos**.\n' +
      '2. É permitido pausar, mas o cronômetro **não para**.\n' +
      '3. Registre a **distância total** percorrida em metros.\n\n' +
      '**Referência adultos saudáveis:** ~ 400–700 m. Valores < 300 m indicam comprometimento funcional.',
    inputs: [
      { name: 'distanceMeters', label: 'Distância (metros)', type: 'number', step: 1, unit: 'm' },
    ],
  },
];

export type AssessmentResult = {
  value: number | null;
  label: string;
  classification: 'good' | 'attention' | 'risk' | 'info';
  message: string;
  details?: string[];
};

export function calculateTestResult(
  testId: string,
  values: Record<string, number>,
): AssessmentResult {
  switch (testId) {
    case 'handgrip': {
      const r = values.rightLimb ?? 0;
      const l = values.leftLimb ?? 0;
      const max = Math.max(r, l);
      return {
        value: max,
        label: 'Pico de Força',
        classification: max >= 27 ? 'good' : max >= 16 ? 'attention' : 'risk',
        message: `Maior valor: ${max.toFixed(1)} kg`,
        details: [
          'Corte EWGSOP2: H < 27 kg / M < 16 kg',
          `Direita: ${r.toFixed(1)} kg · Esquerda: ${l.toFixed(1)} kg`,
        ],
      };
    }
    case 'load_cell_asymmetry': {
      const r = values.rightForce ?? 0;
      const l = values.leftForce ?? 0;
      if (!r || !l) {
        return { value: null, label: 'LSI%', classification: 'info', message: 'Informe os dois lados.' };
      }
      const lsi = (Math.min(r, l) / Math.max(r, l)) * 100;
      const asym = 100 - lsi;
      return {
        value: lsi,
        label: 'Índice de Simetria',
        classification: asym <= 10 ? 'good' : asym <= 15 ? 'attention' : 'risk',
        message: `LSI: ${lsi.toFixed(1)}% (assimetria de ${asym.toFixed(1)}%)`,
        details: [`Lado fraco: ${Math.min(r, l).toFixed(1)} · Lado forte: ${Math.max(r, l).toFixed(1)}`],
      };
    }
    case 'calf_circumference': {
      const c = values.circumference ?? 0;
      return {
        value: c,
        label: 'Circunferência',
        classification: c >= 33 ? 'good' : c >= 31 ? 'attention' : 'risk',
        message: `${c.toFixed(1)} cm`,
        details: c < 31 ? ['⚠️ < 31 cm — risco de sarcopenia (EWGSOP2)'] : undefined,
      };
    }
    case 'tug': {
      const t = values.timeSeconds ?? 0;
      return {
        value: t,
        label: 'Tempo TUG',
        classification: t < 10 ? 'good' : t <= 12 ? 'attention' : 'risk',
        message: `${t.toFixed(1)} s`,
        details: [t < 10 ? 'Normal' : t <= 12 ? 'Atenção' : 'Risco de quedas'],
      };
    }
    case 'cmj': {
      const stand = values.standReach ?? 0;
      const jump = values.jumpReach ?? 0;
      const h = Math.max(0, jump - stand);
      return {
        value: h,
        label: 'Altura do Salto',
        classification: h >= 40 ? 'good' : h >= 25 ? 'attention' : 'risk',
        message: `${h.toFixed(1)} cm`,
        details: [`Parado: ${stand.toFixed(1)} cm · Saltando: ${jump.toFixed(1)} cm`],
      };
    }
    case 'walk_6min': {
      const d = values.distanceMeters ?? 0;
      return {
        value: d,
        label: 'Distância',
        classification: d >= 400 ? 'good' : d >= 300 ? 'attention' : 'risk',
        message: `${d.toFixed(0)} m`,
        details: [d < 300 ? 'Comprometimento funcional' : d < 400 ? 'Abaixo do esperado' : 'Dentro do esperado'],
      };
    }
    default:
      return { value: null, label: '—', classification: 'info', message: 'Sem cálculo definido.' };
  }
}

export function groupAssessmentsByCategory(tests: AssessmentTest[] = PHYSICAL_ASSESSMENTS) {
  return tests.reduce<Record<string, AssessmentTest[]>>((acc, t) => {
    (acc[t.category] ||= []).push(t);
    return acc;
  }, {});
}