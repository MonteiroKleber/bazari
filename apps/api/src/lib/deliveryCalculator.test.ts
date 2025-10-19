import { describe, it, expect } from 'vitest';
import {
  calculateDeliveryFee,
  estimatePackageDetails,
} from './deliveryCalculator';
import { calculateDistance } from './geoUtils';
import type { Address } from '../types/delivery.types';

describe('geoUtils', () => {
  describe('calculateDistance', () => {
    it('deve calcular distância entre dois pontos no Rio de Janeiro', () => {
      // Centro do Rio para Copacabana
      const distance = calculateDistance(
        -22.9068,
        -43.1729,
        -22.9711,
        -43.1825
      );

      expect(distance).toBeGreaterThan(7);
      expect(distance).toBeLessThan(8);
    });

    it('deve calcular distância entre Rio e São Paulo', () => {
      const distance = calculateDistance(
        -22.9068,
        -43.1729, // Rio
        -23.5505,
        -46.6333 // SP
      );

      expect(distance).toBeGreaterThan(350);
      expect(distance).toBeLessThan(450);
    });

    it('deve retornar 0 para mesmas coordenadas', () => {
      const distance = calculateDistance(-22.9068, -43.1729, -22.9068, -43.1729);
      expect(distance).toBe(0);
    });
  });
});

describe('deliveryCalculator', () => {
  describe('calculateDeliveryFee', () => {
    const pickupAddress: Address = {
      street: 'Av. Atlântica',
      number: '1702',
      city: 'Rio de Janeiro',
      state: 'RJ',
      zipCode: '22021-001',
      country: 'BR',
      lat: -22.9711,
      lng: -43.1825,
    };

    const deliveryAddress: Address = {
      street: 'Rua Primeiro de Março',
      number: '1',
      city: 'Rio de Janeiro',
      state: 'RJ',
      zipCode: '20010-000',
      country: 'BR',
      lat: -22.9068,
      lng: -43.1729,
    };

    it('deve calcular frete para envelope (pacote leve)', async () => {
      const result = await calculateDeliveryFee({
        pickupAddress,
        deliveryAddress,
        packageType: 'envelope',
        weight: 0.1,
      });

      expect(result).toBeDefined();
      expect(result.totalBzr).toBeDefined();
      expect(result.distance).toBeGreaterThan(7);
      expect(result.estimatedTimeMinutes).toBeGreaterThan(10);
      expect(result.breakdown).toBeDefined();
      expect(result.breakdown.baseFee).toBe('5.00');
      expect(result.breakdown.packageTypeFee).toBe('0.00');
    });

    it('deve calcular frete para caixa média', async () => {
      const result = await calculateDeliveryFee({
        pickupAddress,
        deliveryAddress,
        packageType: 'medium',
        weight: 5,
      });

      expect(result).toBeDefined();
      expect(parseFloat(result.totalBzr)).toBeGreaterThan(10);
      expect(result.breakdown.packageTypeFee).toBe('2.00');
    });

    it('deve calcular frete para pacote frágil (taxa extra)', async () => {
      const result = await calculateDeliveryFee({
        pickupAddress,
        deliveryAddress,
        packageType: 'fragile',
        weight: 2,
      });

      expect(result).toBeDefined();
      expect(parseFloat(result.totalBzr)).toBeGreaterThan(10);
      expect(result.breakdown.packageTypeFee).toBe('3.00');
    });

    it('deve aplicar taxa mínima quando cálculo for muito baixo', async () => {
      const nearbyAddress: Address = {
        ...deliveryAddress,
        lat: -22.9068,
        lng: -43.1730, // Muito próximo
      };

      const result = await calculateDeliveryFee({
        pickupAddress: nearbyAddress,
        deliveryAddress: {
          ...nearbyAddress,
          lat: -22.9069,
          lng: -43.1731,
        },
        packageType: 'envelope',
        weight: 0.1,
      });

      expect(parseFloat(result.totalBzr)).toBeGreaterThanOrEqual(5.0);
    });

    it('deve estimar coordenadas quando lat/lng não fornecidos', async () => {
      const addressWithoutCoords: Address = {
        street: 'Rua da Assembleia',
        number: '10',
        city: 'Rio de Janeiro',
        state: 'RJ',
        zipCode: '20011-000',
        country: 'BR',
      };

      const result = await calculateDeliveryFee({
        pickupAddress: addressWithoutCoords,
        deliveryAddress: {
          ...addressWithoutCoords,
          zipCode: '22021-001',
        },
        packageType: 'small',
      });

      expect(result).toBeDefined();
      expect(result.distance).toBeGreaterThan(0);
    });

    it('deve calcular tempo estimado baseado na distância', async () => {
      const result = await calculateDeliveryFee({
        pickupAddress,
        deliveryAddress,
        packageType: 'envelope',
      });

      // Distância ~7km, velocidade 30km/h = ~14 minutos
      expect(result.estimatedTimeMinutes).toBeGreaterThan(10);
      expect(result.estimatedTimeMinutes).toBeLessThan(30);
    });

    it('deve incluir breakdown detalhado', async () => {
      const result = await calculateDeliveryFee({
        pickupAddress,
        deliveryAddress,
        packageType: 'large_box',
        weight: 10,
      });

      expect(result.breakdown.baseFee).toBe('5.00');
      expect(parseFloat(result.breakdown.distanceFee)).toBeGreaterThan(0);
      expect(parseFloat(result.breakdown.weightFee)).toBeGreaterThan(0);
      expect(parseFloat(result.breakdown.packageTypeFee)).toBeGreaterThan(0);

      // Verificar que a soma bate
      const sum =
        parseFloat(result.breakdown.baseFee) +
        parseFloat(result.breakdown.distanceFee) +
        parseFloat(result.breakdown.weightFee) +
        parseFloat(result.breakdown.packageTypeFee);

      expect(parseFloat(result.totalBzr)).toBeCloseTo(sum, 2);
    });
  });

  describe('estimatePackageDetails', () => {
    it('deve retornar small para 1 item', () => {
      const items = [{ name: 'Livro', qty: 1, price: 50 }];
      const result = estimatePackageDetails(items);

      expect(result.packageType).toBe('small');
      expect(result.weight).toBe(1.0);
    });

    it('deve retornar medium para 2-3 itens', () => {
      const items = [
        { name: 'Livro', qty: 2, price: 50 },
        { name: 'Caneta', qty: 1, price: 5 },
      ];
      const result = estimatePackageDetails(items);

      expect(result.packageType).toBe('medium');
      expect(result.weight).toBe(2.5);
    });

    it('deve retornar large para 4+ itens', () => {
      const items = [
        { name: 'Livro', qty: 3, price: 50 },
        { name: 'Caderno', qty: 2, price: 20 },
      ];
      const result = estimatePackageDetails(items);

      expect(result.packageType).toBe('large');
      expect(result.weight).toBe(5.0);
    });

    it('deve contar quantidade total corretamente', () => {
      const items = [
        { name: 'Item A', qty: 1, price: 10 },
        { name: 'Item B', qty: 1, price: 10 },
        { name: 'Item C', qty: 1, price: 10 },
      ];
      const result = estimatePackageDetails(items);

      expect(result.packageType).toBe('medium');
    });
  });
});
