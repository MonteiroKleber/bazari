import { Button } from '@/components/ui/button';
import { Lock, Loader2 } from 'lucide-react';
import { useCouncilMotion } from '../hooks';
import { toast } from 'sonner';

interface CloseMotionButtonProps {
  motionHash: string;
  motionIndex: number;
  onCloseSuccess?: () => void;
  disabled?: boolean;
}

export function CloseMotionButton({
  motionHash,
  motionIndex,
  onCloseSuccess,
  disabled = false,
}: CloseMotionButtonProps) {
  const { close, isClosing } = useCouncilMotion();

  const handleClose = async () => {
    try {
      const success = await close(motionHash, motionIndex);

      if (success) {
        toast.success('Motion encerrada! A votação foi encerrada e o resultado foi processado.');

        if (onCloseSuccess) {
          onCloseSuccess();
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao encerrar votação');
    }
  };

  return (
    <Button
      onClick={handleClose}
      disabled={disabled || isClosing}
      variant="outline"
      size="sm"
      className="border-orange-500 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950"
    >
      {isClosing ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          Encerrando...
        </>
      ) : (
        <>
          <Lock className="h-4 w-4 mr-2" />
          Encerrar Votação
        </>
      )}
    </Button>
  );
}
