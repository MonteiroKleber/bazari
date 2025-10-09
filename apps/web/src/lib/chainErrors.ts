export function mapChainError(error: string): string {
  const errorMap: Record<string, string> = {
    'stores.NotOwner': 'Você não tem permissão para realizar esta operação. Apenas o owner pode.',
    'stores.OperatorNotFound': 'Operador não encontrado nesta loja.',
    'stores.OperatorAlreadyExists': 'Este operador já está cadastrado.',
    'stores.OperatorLimitReached': 'Limite de operadores atingido (máximo 10).',
    'stores.StoreNotFound': 'Loja não encontrada on-chain.',
    'stores.TransferAlreadyPending': 'Já existe uma transferência pendente para esta loja.',
    'stores.NoPendingTransfer': 'Não há transferência pendente.',
    'stores.NotPendingRecipient': 'Apenas o destinatário da transferência pode aceitá-la.',
    'uniques.InUse': 'Este NFT está em uso (pode haver transferência pendente).',
    'uniques.NoPermission': 'Sem permissão para modificar este NFT.',
  };

  return errorMap[error] || `Erro on-chain: ${error}`;
}
