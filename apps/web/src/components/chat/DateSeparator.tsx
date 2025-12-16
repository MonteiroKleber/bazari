import { format, isToday, isYesterday, isThisWeek, isThisYear, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DateSeparatorProps {
  date: Date;
}

/**
 * Formata o label da data de forma inteligente
 */
function formatDateLabel(date: Date): string {
  if (isToday(date)) return 'Hoje';
  if (isYesterday(date)) return 'Ontem';
  if (isThisWeek(date, { weekStartsOn: 0 })) {
    return format(date, 'EEEE', { locale: ptBR }); // "Segunda-feira"
  }
  if (isThisYear(date)) {
    return format(date, "d 'de' MMMM", { locale: ptBR }); // "15 de Janeiro"
  }
  return format(date, "d 'de' MMMM 'de' yyyy", { locale: ptBR }); // "15 de Janeiro de 2024"
}

/**
 * Componente de separador de data entre mensagens
 */
export function DateSeparator({ date }: DateSeparatorProps) {
  return (
    <div className="flex items-center justify-center py-3">
      <span className="bg-muted text-muted-foreground text-xs px-3 py-1 rounded-full capitalize">
        {formatDateLabel(date)}
      </span>
    </div>
  );
}

/**
 * Verifica se deve mostrar separador de data entre duas mensagens
 */
export function shouldShowDateSeparator(
  currentTimestamp: number,
  previousTimestamp: number | undefined
): boolean {
  if (previousTimestamp === undefined) return true;

  const currentDate = new Date(currentTimestamp);
  const previousDate = new Date(previousTimestamp);

  return !isSameDay(currentDate, previousDate);
}
