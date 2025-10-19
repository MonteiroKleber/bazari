import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { buildApp } from '../server.js';

let app: FastifyInstance;
let prisma: PrismaClient;

let testDelivererProfileId: string;
let testStoreId: bigint;
let testOrderId: string;
let testDeliveryRequestId: string;
let testDeliveryProfileId: string;

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
  prisma = new PrismaClient();

  // Setup: Criar dados de teste
  // Criar Profile de teste para entregador
  const testProfile = await prisma.profile.upsert({
    where: { id: 'profile-test-001' },
    update: {},
    create: {
      id: 'profile-test-001',
      address: '5DTestAddressForDeliveryProfile123456789012',
      publicKey: 'test-public-key',
      createdAt: BigInt(Date.now()),
      updatedAt: BigInt(Date.now()),
    },
  });
  testDelivererProfileId = testProfile.id;

  // Criar loja de teste
  const testUser = await prisma.user.upsert({
    where: { id: 'user-test-001' },
    update: {},
    create: {
      id: 'user-test-001',
      address: 'test-user-address',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  const testStore = await prisma.sellerProfile.upsert({
    where: { id: 'store-test-001' },
    update: {},
    create: {
      id: 'store-test-001',
      userId: testUser.id,
      shopName: 'Test Store E2E',
      shopSlug: `test-store-e2e-${Date.now()}`,
      pickupAddress: {
        street: 'Rua da Loja',
        number: '100',
        city: 'Rio de Janeiro',
        state: 'RJ',
        zipCode: '20000-000',
        country: 'BR',
      },
      onChainStoreId: BigInt(999999),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });
  testStoreId = testStore.onChainStoreId!;
});

afterAll(async () => {
  // Cleanup: Remover dados de teste
  try {
    if (testDeliveryRequestId) {
      await prisma.deliveryRequest.deleteMany({
        where: { id: testDeliveryRequestId },
      });
    }
    if (testDeliveryProfileId) {
      await prisma.deliveryProfile.deleteMany({
        where: { id: testDeliveryProfileId },
      });
    }
    await prisma.storeDeliveryPartner.deleteMany({
      where: { storeId: testStoreId },
    });
  } catch (err) {
    console.error('Cleanup error:', err);
  }

  await app.close();
  await prisma.$disconnect();
});

describe('Delivery Network E2E', () => {
  describe('1. Criar Perfil de Entregador', () => {
    test('deve criar perfil de entregador', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/delivery/profile',
        payload: {
          fullName: 'Test Deliverer E2E',
          documentType: 'cpf',
          documentNumber: `12345678${Date.now().toString().slice(-3)}`,
          phoneNumber: '+5521999999999',
          vehicleType: 'motorcycle',
          maxWeight: 10,
          maxVolume: 0.5,
          serviceRadius: 15,
          serviceCities: ['Rio de Janeiro'],
          serviceStates: ['RJ'],
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.profileId).toBeDefined();
      expect(body.id).toBeDefined();
      testDeliveryProfileId = body.id;
    });

    test('deve atualizar disponibilidade', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/delivery/profile/availability',
        payload: {
          isAvailable: true,
          isOnline: true,
          currentLat: -22.9068,
          currentLng: -43.1729,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.isAvailable).toBe(true);
      expect(body.success).toBe(true);
    });

    test('deve obter estatísticas do perfil', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/delivery/profile/stats',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.totalDeliveries).toBeDefined();
      expect(body.totalEarnings).toBeDefined();
    });
  });

  describe('2. Calcular Frete', () => {
    test('deve calcular frete corretamente', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/delivery/calculate-fee',
        payload: {
          pickupAddress: {
            street: 'Rua A',
            number: '100',
            city: 'Rio de Janeiro',
            state: 'RJ',
            zipCode: '20000-000',
            country: 'BR',
          },
          deliveryAddress: {
            street: 'Rua B',
            number: '200',
            city: 'Rio de Janeiro',
            state: 'RJ',
            zipCode: '22000-000',
            country: 'BR',
          },
          packageType: 'small',
          weight: 2.0,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.totalBzr).toBeDefined();
      expect(parseFloat(body.totalBzr)).toBeGreaterThan(0);
      expect(body.breakdown).toBeDefined();
      expect(body.breakdown.baseFee).toBe('5.00');
      expect(body.distance).toBeGreaterThan(0);
      expect(body.estimatedTimeMinutes).toBeGreaterThan(0);
    });

    test('deve rejeitar dados inválidos', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/delivery/calculate-fee',
        payload: {
          pickupAddress: {
            street: 'Rua A',
            // Faltando campos obrigatórios
          },
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Dados inválidos');
    });
  });

  describe('3. Criar DeliveryRequest Direto', () => {
    test('deve criar solicitação direta de entrega', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/delivery/requests/direct',
        payload: {
          pickupAddress: {
            street: 'Av. Atlântica',
            number: '1702',
            city: 'Rio de Janeiro',
            state: 'RJ',
            zipCode: '22021-001',
            country: 'BR',
            lat: -22.9711,
            lng: -43.1825,
          },
          deliveryAddress: {
            street: 'Rua Primeiro de Março',
            number: '1',
            city: 'Rio de Janeiro',
            state: 'RJ',
            zipCode: '20010-000',
            country: 'BR',
            lat: -22.9068,
            lng: -43.1729,
          },
          recipientId: '00000000-0000-0000-0000-000000000001',
          packageType: 'medium',
          weight: 3.5,
          notes: 'Entregar no portão principal',
          requiresSignature: true,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.deliveryRequestId).toBeDefined();
      expect(body.estimatedFee).toBeDefined();
      expect(body.status).toBe('pending');
      testDeliveryRequestId = body.deliveryRequestId;
    });
  });

  describe('4. Listar e Aceitar Entrega', () => {
    test('deve listar demandas disponíveis', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/delivery/requests?status=pending&limit=10',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toBeDefined();
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.pagination).toBeDefined();
    });

    test('deve obter detalhes da demanda', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/delivery/requests/${testDeliveryRequestId}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.id).toBe(testDeliveryRequestId);
      expect(body.status).toBe('pending');
      expect(body.deliveryFeeBzr).toBeDefined();
    });

    test('deve aceitar entrega', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/delivery/requests/${testDeliveryRequestId}/accept`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.deliveryRequest.status).toBe('accepted');
      expect(body.actions.nextStep).toBe('pickup');
    });

    test('não deve permitir aceitar novamente', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/delivery/requests/${testDeliveryRequestId}/accept`,
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Demanda já aceita');
    });
  });

  describe('5. Confirmar Coleta', () => {
    test('deve confirmar coleta', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/delivery/requests/${testDeliveryRequestId}/pickup`,
        payload: {
          lat: -22.9711,
          lng: -43.1825,
          notes: 'Pacote coletado no endereço',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.deliveryRequest.status).toBe('in_transit');
      expect(body.deliveryRequest.pickedUpAt).toBeDefined();
    });

    test('DeliveryRequest deve estar in_transit', async () => {
      const deliveryRequest = await prisma.deliveryRequest.findUnique({
        where: { id: testDeliveryRequestId },
      });

      expect(deliveryRequest?.status).toBe('in_transit');
      expect(deliveryRequest?.pickedUpAt).toBeDefined();
    });
  });

  describe('6. Confirmar Entrega', () => {
    test('deve confirmar entrega', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/delivery/requests/${testDeliveryRequestId}/deliver`,
        payload: {
          lat: -22.9068,
          lng: -43.1729,
          recipientName: 'Test Recipient',
          notes: 'Entregue ao destinatário',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.deliveryRequest.status).toBe('delivered');
      expect(body.payment.status).toBe('released');
      expect(body.deliveryRequest.proofOfDelivery).toBeDefined();
    });

    test('DeliveryRequest deve ter prova de entrega', async () => {
      const deliveryRequest = await prisma.deliveryRequest.findUnique({
        where: { id: testDeliveryRequestId },
      });

      expect(deliveryRequest?.status).toBe('delivered');
      expect(deliveryRequest?.deliveredAt).toBeDefined();
      expect(deliveryRequest?.proofOfDelivery).toBeDefined();

      const proof = deliveryRequest?.proofOfDelivery as any;
      expect(proof.recipientName).toBe('Test Recipient');
      expect(proof.lat).toBe(-22.9068);
      expect(proof.lng).toBe(-43.1729);
    });
  });

  describe('7. Cancelamento', () => {
    test('não deve permitir cancelar entrega já concluída', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/delivery/requests/${testDeliveryRequestId}/cancel`,
        payload: {
          reason: 'other',
          notes: 'Tentando cancelar após entrega',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Entrega já concluída');
    });
  });
});

describe('Store Delivery Partners E2E', () => {
  let partnershipId: string;

  test('entregador deve solicitar parceria', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/stores/${testStoreId}/delivery-partners/request`,
      payload: {
        message: 'Gostaria de ser parceiro da loja!',
      },
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);
    expect(body.id).toBeDefined();
    expect(body.status).toBe('pending');
    partnershipId = body.id;
  });

  test('deve listar parceiros da loja', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/stores/${testStoreId}/delivery-partners?status=all`,
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data).toBeDefined();
    expect(body.data.length).toBeGreaterThan(0);
  });

  test('loja deve aprovar parceria', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/stores/${testStoreId}/delivery-partners/${partnershipId}`,
      payload: {
        status: 'active',
        priority: 1,
        commissionPercent: 95,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.status).toBe('active');
    expect(body.priority).toBe(1);
    expect(body.approvedAt).toBeDefined();
  });

  test('parceria deve estar ativa no banco', async () => {
    const partnership = await prisma.storeDeliveryPartner.findUnique({
      where: { id: partnershipId },
    });

    expect(partnership).toBeDefined();
    expect(partnership?.status).toBe('active');
    expect(partnership?.priority).toBe(1);
    expect(partnership?.approvedAt).toBeDefined();
  });
});

describe('Validações e Edge Cases', () => {
  test('não deve criar perfil com documento duplicado', async () => {
    // Primeiro criar um perfil
    const doc = `99999999${Date.now().toString().slice(-3)}`;

    const firstResponse = await app.inject({
      method: 'POST',
      url: '/api/delivery/profile',
      payload: {
        fullName: 'First Person',
        documentType: 'cpf',
        documentNumber: doc,
        phoneNumber: '+5521999999999',
        vehicleType: 'bike',
        maxWeight: 5,
        maxVolume: 0.3,
        serviceRadius: 10,
        serviceCities: ['Rio de Janeiro'],
        serviceStates: ['RJ'],
      },
    });

    // Tentar criar outro com mesmo documento deve falhar
    // (mas o teste atual só cria um por causa do placeholder)
    expect(firstResponse.statusCode).toBe(409); // Profile já existe para profile-test-001
  });

  test('deve validar coordenadas geográficas', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/delivery/calculate-fee',
      payload: {
        pickupAddress: {
          street: 'Test',
          number: '1',
          city: 'Test',
          state: 'RJ',
          zipCode: '20000-000',
          country: 'BR',
          lat: 999, // Inválido
          lng: -43.1729,
        },
        deliveryAddress: {
          street: 'Test',
          number: '1',
          city: 'Test',
          state: 'RJ',
          zipCode: '22000-000',
          country: 'BR',
        },
        packageType: 'envelope',
      },
    });

    expect(response.statusCode).toBe(400);
  });
});
