import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

interface SmartBackButtonProps {
  targetUrl: string;
  variant?: 'ghost' | 'outline' | 'secondary';
  className?: string;
  onBeforeNavigate?: () => void; // Callback antes de navegar (ex: fechar modal)
}

/**
 * Botão inteligente que volta para a rota de origem se for pública,
 * ou para a landing page se for protegida
 */
export function SmartBackButton({ targetUrl, variant = 'outline', className = '', onBeforeNavigate }: SmartBackButtonProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Rotas públicas específicas - NOT /app/*
  const isPublicTarget = (
    targetUrl === '/' ||
    targetUrl.startsWith('/search') ||
    targetUrl.startsWith('/explore') ||
    targetUrl.startsWith('/product/') ||
    targetUrl.startsWith('/service/') ||
    targetUrl.startsWith('/loja/') ||
    targetUrl.startsWith('/vendedor/') ||
    targetUrl.startsWith('/marketplace')
  );

  const handleBack = () => {
    console.log('🔙 SmartBackButton.handleBack called', {
      targetUrl,
      isPublicTarget,
      willNavigateTo: isPublicTarget ? targetUrl : '/'
    });

    // Chama callback antes de navegar (ex: fechar modal)
    if (onBeforeNavigate) {
      console.log('🔙 Calling onBeforeNavigate callback');
      onBeforeNavigate();
    }

    if (isPublicTarget) {
      // Volta para a página pública que estava vendo
      console.log('🔙 Navigating to public target:', targetUrl);
      navigate(targetUrl, { replace: true });
    } else {
      // Vai para landing page (rota protegida ou indefinida)
      console.log('🔙 Navigating to home: /');
      navigate('/', { replace: true });
    }

    console.log('🔙 Navigate call completed');
  };

  const buttonText = isPublicTarget
    ? t('auth.smartBack.returnToPage', { defaultValue: '← Voltar' })
    : t('auth.smartBack.backToHome', { defaultValue: '← Voltar ao Início' });

  return (
    <Button variant={variant} onClick={handleBack} className={className}>
      {buttonText}
    </Button>
  );
}
