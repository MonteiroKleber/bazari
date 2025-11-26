/**
 * Página de Teste - Verificar se os widgets de Rewards aparecem
 */

import { StreakWidgetCompact, CashbackBalanceCompact } from '@/components/rewards';

export default function TestRewardsHeader() {
  return (
    <div className="container mx-auto p-8 space-y-8">
      <h1 className="text-3xl font-bold">Teste: Rewards Header Components</h1>

      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold mb-2">StreakWidgetCompact</h2>
          <div className="p-4 bg-gray-100 rounded inline-block">
            <StreakWidgetCompact />
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">CashbackBalanceCompact</h2>
          <div className="p-4 bg-gray-100 rounded inline-block">
            <CashbackBalanceCompact />
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">Ambos juntos (como no header)</h2>
          <div className="flex items-center gap-3 p-4 bg-gray-100 rounded">
            <StreakWidgetCompact />
            <CashbackBalanceCompact />
          </div>
        </div>
      </div>

      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded">
        <h3 className="font-semibold mb-2">Instruções:</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Se você vê os widgets acima, eles estão funcionando!</li>
          <li>Eles podem mostrar valores padrão (0) se o backend não estiver rodando</li>
          <li>Verifique o console do navegador para erros</li>
          <li>Os widgets devem aparecer no header da mesma forma</li>
        </ol>
      </div>
    </div>
  );
}
