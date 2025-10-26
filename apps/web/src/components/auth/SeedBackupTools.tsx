import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Copy, Download, Printer, Check } from 'lucide-react';
import { toast } from 'sonner';

interface SeedBackupToolsProps {
  mnemonic: string[];
}

export function SeedBackupTools({ mnemonic }: SeedBackupToolsProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(mnemonic.join(' '));
      setCopied(true);
      toast.success(t('auth.create.backup.copied', { defaultValue: 'Copiado para área de transferência!' }));
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error(t('auth.create.backup.copyError', { defaultValue: 'Erro ao copiar' }));
    }
  };

  const handleDownload = () => {
    try {
      const content = `BAZARI SEED PHRASE BACKUP
========================

⚠️  IMPORTANTE: Guarde este arquivo em local MUITO seguro!
⚠️  Quem tiver acesso a essas palavras terá acesso TOTAL à sua conta.
⚠️  NUNCA compartilhe estas palavras com ninguém.

Suas 12 palavras (na ordem):
${mnemonic.map((word, i) => `${i + 1}. ${word}`).join('\n')}

========================
Data: ${new Date().toLocaleString('pt-BR')}
`;

      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `bazari-seed-backup-${Date.now()}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(t('auth.create.backup.downloaded', { defaultValue: 'Arquivo baixado com sucesso!' }));
    } catch (error) {
      toast.error(t('auth.create.backup.downloadError', { defaultValue: 'Erro ao baixar arquivo' }));
    }
  };

  const handlePrint = () => {
    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error(t('auth.create.backup.printError', { defaultValue: 'Erro ao abrir janela de impressão' }));
        return;
      }

      const content = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Bazari Seed Phrase Backup</title>
          <style>
            body {
              font-family: 'Courier New', monospace;
              padding: 40px;
              max-width: 800px;
              margin: 0 auto;
            }
            .header {
              text-align: center;
              margin-bottom: 40px;
              border-bottom: 2px solid #000;
              padding-bottom: 20px;
            }
            .warning {
              background: #fff3cd;
              border: 2px solid #ffc107;
              padding: 20px;
              margin: 20px 0;
              border-radius: 8px;
            }
            .warning h3 {
              margin-top: 0;
              color: #856404;
            }
            .words {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 10px;
              margin: 30px 0;
              padding: 20px;
              background: #f8f9fa;
              border: 1px solid #dee2e6;
              border-radius: 8px;
            }
            .word {
              padding: 10px;
              background: white;
              border: 1px solid #dee2e6;
              border-radius: 4px;
            }
            .word-number {
              font-weight: bold;
              margin-right: 10px;
              color: #6c757d;
            }
            .word-text {
              font-size: 16px;
              font-weight: bold;
              text-transform: uppercase;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #dee2e6;
              text-align: center;
              color: #6c757d;
              font-size: 12px;
            }
            @media print {
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🔐 BAZARI SEED PHRASE BACKUP</h1>
            <p>Backup criado em: ${new Date().toLocaleString('pt-BR')}</p>
          </div>

          <div class="warning">
            <h3>⚠️ IMPORTANTE - LEIA COM ATENÇÃO</h3>
            <ul>
              <li>Estas 12 palavras são a ÚNICA forma de recuperar sua conta</li>
              <li>Quem tiver acesso a elas terá acesso TOTAL à sua conta</li>
              <li>NUNCA compartilhe estas palavras com ninguém</li>
              <li>Guarde este papel em local MUITO seguro (cofre, etc)</li>
              <li>Considere fazer cópias e guardar em locais diferentes</li>
            </ul>
          </div>

          <h2>Suas 12 Palavras Secretas (na ordem correta):</h2>
          <div class="words">
            ${mnemonic.map((word, i) => `
              <div class="word">
                <span class="word-number">${i + 1}.</span>
                <span class="word-text">${word}</span>
              </div>
            `).join('')}
          </div>

          <div class="footer">
            <p>Bazari - Marketplace Descentralizado</p>
            <p>Este documento contém informações sensíveis. Mantenha-o seguro.</p>
          </div>

          <div class="no-print" style="margin-top: 40px; text-align: center;">
            <button onclick="window.print()" style="padding: 10px 20px; font-size: 16px; cursor: pointer;">
              🖨️ Imprimir Agora
            </button>
            <button onclick="window.close()" style="padding: 10px 20px; font-size: 16px; cursor: pointer; margin-left: 10px;">
              Cancelar
            </button>
          </div>
        </body>
        </html>
      `;

      printWindow.document.write(content);
      printWindow.document.close();

      toast.success(t('auth.create.backup.printReady', { defaultValue: 'Janela de impressão aberta!' }));
    } catch (error) {
      toast.error(t('auth.create.backup.printError', { defaultValue: 'Erro ao preparar impressão' }));
    }
  };

  return (
    <div className="flex flex-col sm:flex-row gap-2 justify-center">
      <Button
        variant="outline"
        size="sm"
        onClick={handleCopy}
        className="gap-2"
      >
        {copied ? (
          <>
            <Check className="h-4 w-4" />
            {t('auth.create.backup.copiedButton', { defaultValue: 'Copiado!' })}
          </>
        ) : (
          <>
            <Copy className="h-4 w-4" />
            {t('auth.create.backup.copyButton', { defaultValue: 'Copiar' })}
          </>
        )}
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={handleDownload}
        className="gap-2"
      >
        <Download className="h-4 w-4" />
        {t('auth.create.backup.downloadButton', { defaultValue: 'Download .txt' })}
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={handlePrint}
        className="gap-2"
      >
        <Printer className="h-4 w-4" />
        {t('auth.create.backup.printButton', { defaultValue: 'Imprimir' })}
      </Button>
    </div>
  );
}
