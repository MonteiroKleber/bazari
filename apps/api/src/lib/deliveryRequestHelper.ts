import { PrismaClient } from '@prisma/client';
import {
  calculateDeliveryFee,
  estimatePackageDetails,
} from './deliveryCalculator.js';
import { DeliveryRequestStatus } from '../types/delivery.types.js';

export async function createDeliveryRequestForOrder(
  prisma: PrismaClient,
  orderId: string
): Promise<{ deliveryRequestId: string; deliveryFeeBzr: string } | null> {
  // 1. Buscar Order com items e store
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
    },
  });

  if (!order) {
    throw new Error(`Order ${orderId} não encontrada`);
  }

  // Se não tem shippingAddress, não precisa de delivery
  if (!order.shippingAddress) {
    return null;
  }

  // 2. Buscar loja
  if (!order.sellerStoreId) {
    console.warn(`Order ${orderId} não tem sellerStoreId, pulando delivery`);
    return null;
  }

  const store = await prisma.sellerProfile.findUnique({
    where: { id: order.sellerStoreId },
    select: {
      id: true,
      onChainStoreId: true,
      pickupAddress: true,
      shopName: true,
    },
  });

  if (!store) {
    throw new Error(`Store ${order.sellerStoreId} não encontrada`);
  }

  // Se loja não tem endereço de coleta, usar endereço padrão (mock)
  const pickupAddress =
    store.pickupAddress ||
    ({
      street: 'Endereço da Loja (configurar)',
      number: 'S/N',
      city: 'Rio de Janeiro',
      state: 'RJ',
      zipCode: '20000-000',
      country: 'BR',
      contactName: store.shopName,
    } as any);

  // 3. Buscar entregadores vinculados à loja
  const linkedPartners = await prisma.storeDeliveryPartner.findMany({
    where: {
      storeId: store.onChainStoreId!,
      status: 'active',
    },
    orderBy: { priority: 'asc' },
    select: { deliveryPersonId: true },
  });

  // 4. Estimar características do pacote
  const packageDetails = estimatePackageDetails(order.items);

  // 5. Calcular frete
  const feeResult = await calculateDeliveryFee({
    pickupAddress,
    deliveryAddress: order.shippingAddress as any,
    packageType: packageDetails.packageType,
    weight: packageDetails.weight,
  });

  // 6. Criar DeliveryRequest
  const deliveryRequest = await prisma.deliveryRequest.create({
    data: {
      sourceType: 'order',
      orderId: order.id,
      senderId: order.sellerStoreId,
      senderType: 'store',
      recipientId: order.buyerAddr, // TODO: mapear para profileId real
      pickupAddress,
      deliveryAddress: order.shippingAddress,
      packageType: packageDetails.packageType,
      weight: packageDetails.weight,
      deliveryFeeBzr: feeResult.totalBzr,
      distance: feeResult.distance,
      preferredDeliverers: linkedPartners.map((p) => p.deliveryPersonId),
      isPrivateNetwork: linkedPartners.length > 0,
      status: DeliveryRequestStatus.PENDING,
      expiresAt:
        linkedPartners.length > 0
          ? BigInt(Date.now() + 2 * 60 * 1000)
          : null, // 2min para rede vinculada
      createdAt: BigInt(Date.now()),
      updatedAt: BigInt(Date.now()),
    },
  });

  console.log(
    `[DELIVERY] DeliveryRequest ${deliveryRequest.id} criado para Order ${orderId}`
  );

  // 7. Notificar entregadores (TODO: implementar worker/queue)
  // await notifyDeliveryNetwork(deliveryRequest.id);

  return {
    deliveryRequestId: deliveryRequest.id,
    deliveryFeeBzr: feeResult.totalBzr,
  };
}
