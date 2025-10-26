export interface PinStrength {
  score: 0 | 1 | 2 | 3 | 4; // 0=muito fraco, 4=muito forte
  feedback: string[];
  color: 'red' | 'orange' | 'yellow' | 'green';
  label: string;
}

export function calculatePinStrength(pin: string): PinStrength {
  const length = pin.length;
  let score = 0;
  const feedback: string[] = [];

  if (!pin) {
    return {
      score: 0,
      feedback: [],
      color: 'red',
      label: '',
    };
  }

  // Critério 1: Comprimento
  if (length >= 8) score++;
  if (length >= 10) score++;
  else if (length < 8) feedback.push('Use pelo menos 8 dígitos');
  else feedback.push('Use pelo menos 10 dígitos');

  // Critério 2: Não é sequencial
  const isSequential = /^(012|123|234|345|456|567|678|789|890|987|876|765|654|543|432|321|210)+$/.test(pin);
  if (!isSequential) {
    score++;
  } else {
    feedback.push('Evite sequências (123, 456, etc)');
  }

  // Critério 3: Não é repetitivo
  const isRepetitive = /^(\d)\1+$/.test(pin);
  if (!isRepetitive) {
    score++;
  } else {
    feedback.push('Evite repetições (111, 000, etc)');
  }

  // Critério 4: Variedade de dígitos
  const uniqueDigits = new Set(pin.split('')).size;
  if (uniqueDigits >= 5) {
    score++;
  } else {
    feedback.push('Use mais dígitos diferentes');
  }

  const color: PinStrength['color'] =
    score <= 1 ? 'red' :
    score === 2 ? 'orange' :
    score === 3 ? 'yellow' : 'green';

  const label =
    score <= 1 ? 'Muito Fraco' :
    score === 2 ? 'Fraco' :
    score === 3 ? 'Bom' : 'Forte';

  return {
    score: score as PinStrength['score'],
    feedback,
    color,
    label,
  };
}
