export function mapChainError(error: string): string {
  const errorMap: Record<string, string> = {
    'stores.NotOwner': 'Voc� n�o tem permiss�o para realizar esta opera��o. Apenas o owner pode.',
    'stores.OperatorNotFound': 'Operador n�o encontrado nesta loja.',
    'stores.OperatorAlreadyExists': 'Este operador j� est� cadastrado.',
    'stores.OperatorLimitReached': 'Limite de operadores atingido (m�ximo 10).',
    'stores.StoreNotFound': 'Loja n�o encontrada on-chain.',
    'stores.TransferAlreadyPending': 'J� existe uma transfer�ncia pendente para esta loja.',
    'stores.NoPendingTransfer': 'N�o h� transfer�ncia pendente.',
    'stores.NotPendingRecipient': 'Apenas o destinat�rio da transfer�ncia pode aceit�-la.',
    'uniques.InUse': 'Este NFT est� em uso (pode haver transfer�ncia pendente).',
    'uniques.NoPermission': 'Sem permiss�o para modificar este NFT.',
  };

  return errorMap[error] || `Erro on-chain: ${error}`;
}
