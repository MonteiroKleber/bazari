import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MultisigApprovalFlow } from '../components/MultisigApprovalFlow';
import { governanceApi } from '../api';
import { Search, Users, RefreshCw, AlertCircle, Loader2 } from 'lucide-react';
import { shortenAddress as formatAddress } from '@/modules/wallet/utils/format';

export function MultisigPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const addressParam = searchParams.get('address');

  const [searchAddress, setSearchAddress] = useState(addressParam || '');
  const [loading, setLoading] = useState(false);
  const [multisigData, setMultisigData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const loadMultisigAccount = useCallback(async (address: string) => {
    if (!address) return;

    setLoading(true);
    setError(null);

    try {
      const response = await governanceApi.getMultisigAccount(address);

      if (response.success && response.data) {
        setMultisigData(response.data);
      } else {
        setError(response.error || 'Multisig account not found');
        setMultisigData(null);
      }
    } catch (err) {
      console.error('Error loading multisig account:', err);
      setError('Failed to load multisig account');
      setMultisigData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (addressParam) {
      loadMultisigAccount(addressParam);
    }
  }, [addressParam, loadMultisigAccount]);

  const handleSearch = () => {
    if (searchAddress) {
      setSearchParams({ address: searchAddress });
    }
  };

  const handleRefresh = () => {
    if (addressParam) {
      loadMultisigAccount(addressParam);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 mobile-safe-bottom">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Multisig</h1>
        <p className="text-muted-foreground">
          Gerencie contas multi-assinatura e aprovações coletivas
        </p>
      </div>

      {/* Search */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Buscar Conta Multisig</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="address">Endereço Multisig</Label>
            <div className="flex gap-2">
              <Input
                id="address"
                placeholder="5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"
                value={searchAddress}
                onChange={(e) => setSearchAddress(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                disabled={loading}
              />
              <Button onClick={handleSearch} disabled={loading || !searchAddress}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Digite o endereço de uma conta multisig para ver seus signatários e transações pendentes
          </p>
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Multisig Data */}
      {multisigData && (
        <div className="space-y-6">
          {/* Account Info */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Informações da Conta</CardTitle>
              <Button variant="outline" size="icon" onClick={handleRefresh} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-muted-foreground">Endereço</Label>
                <p className="font-mono text-sm break-all">{multisigData.address}</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-muted-foreground">Signatários</Label>
                  <p className="text-2xl font-bold">{multisigData.signatories?.length || 0}</p>
                </div>

                <div>
                  <Label className="text-muted-foreground">Threshold</Label>
                  <p className="text-2xl font-bold">{multisigData.threshold || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Signatories */}
          <Card>
            <CardHeader>
              <CardTitle>Signatários</CardTitle>
            </CardHeader>
            <CardContent>
              {multisigData.signatories && multisigData.signatories.length > 0 ? (
                <div className="space-y-2">
                  {multisigData.signatories.map((signatory: string, index: number) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 rounded-md border bg-muted/50"
                    >
                      <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                        <Users className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-mono truncate">
                          {formatAddress(signatory, 12)}
                        </p>
                        <p className="text-xs text-muted-foreground">Signatário {index + 1}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhum signatário encontrado
                </p>
              )}
            </CardContent>
          </Card>

          {/* Pending Transactions */}
          {multisigData.pendingCalls && multisigData.pendingCalls.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Transações Pendentes</h2>
              {multisigData.pendingCalls.map((call: any, index: number) => (
                <MultisigApprovalFlow
                  key={index}
                  multisigAddress={multisigData.address}
                  signatories={multisigData.signatories || []}
                  threshold={multisigData.threshold || 2}
                  approvals={call.approvals || []}
                  callData={call.callData}
                  onApprove={handleRefresh}
                />
              ))}
            </div>
          )}

          {/* No Pending Transactions */}
          {(!multisigData.pendingCalls || multisigData.pendingCalls.length === 0) && (
            <Card>
              <CardContent className="pt-6 text-center py-12">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma transação pendente</h3>
                <p className="text-muted-foreground">
                  Esta conta multisig não possui transações aguardando aprovação
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Empty State */}
      {!multisigData && !error && !loading && (
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Busque uma conta multisig</h3>
            <p className="text-muted-foreground">
              Digite o endereço de uma conta multisig acima para começar
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
