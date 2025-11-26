// @ts-nocheck
// Backend REST API - Commerce Routes
// Sale queries and commission tracking
// path: apps/api/src/routes/blockchain/commerce.ts

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { authOnRequest } from '../../lib/auth/middleware.js';
import { BlockchainService } from '../../services/blockchain/blockchain.service.js';

export async function commerceRoutes(
  app: FastifyInstance,
  options: FastifyPluginOptions
) {
  const blockchainService = BlockchainService.getInstance();

  // ============================================================================
  // GET /api/blockchain/sales/:saleId
  // Get sale details by ID
  // ============================================================================
  app.get('/sales/:saleId', { preHandler: authOnRequest }, async (request, reply) => {
    try {
      const { saleId } = request.params as { saleId: string };
      const api = await blockchainService.getApi();

      // Query sale from bazari-commerce pallet
      const saleOpt = await api.query.bazariCommerce.sales(parseInt(saleId, 10));

      if (saleOpt.isNone) {
        return reply.status(404).send({ error: 'Sale not found' });
      }

      const sale = saleOpt.unwrap();
      const saleJson = sale.toJSON() as any;

      return {
        id: parseInt(saleId, 10),
        orderId: saleJson.orderId,
        seller: saleJson.seller,
        buyer: saleJson.buyer,
        amount: saleJson.amount,
        commissionPaid: saleJson.commissionPaid,
        createdAt: saleJson.createdAt,
      };
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch sale' });
    }
  });

  // ============================================================================
  // GET /api/sales/:saleId/commissions
  // Get commission breakdown for a sale
  // ============================================================================
  app.get('/sales/:saleId/commissions', { preHandler: authOnRequest }, async (request, reply) => {
    try {
      const { saleId } = request.params as { saleId: string };
      const api = await blockchainService.getApi();

      // Query CommissionRecorded events for this sale
      // Filter events by sale ID from event metadata
      const events = await api.query.system.events();
      const commissions: any[] = [];

      events.forEach((record) => {
        const { event } = record;

        if (
          api.events.bazariCommerce.CommissionRecorded.is(event)
        ) {
          const [eventSaleId, recipient, amount, commissionType, level] = event.data;
          const eventSaleIdNum = (eventSaleId as any).toNumber();

          // Filter by sale ID
          if (eventSaleIdNum === parseInt(saleId, 10)) {
            commissions.push({
              recipient: recipient.toString(),
              amount: (amount as any).toString(),
              type: commissionType.toString().toLowerCase(),
              level: level.isSome ? (level.unwrap() as any).toNumber() : null,
              timestamp: record.phase.isApplyExtrinsic
                ? Date.now() / 1000
                : null,
            });
          }
        }
      });

      return commissions;
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch commissions' });
    }
  });

  // ============================================================================
  // GET /api/seller/:address/commission-stats
  // Get aggregated commission statistics for a seller
  // ============================================================================
  app.get('/seller/:address/commission-stats', { preHandler: authOnRequest }, async (request, reply) => {
    try {
      const { address } = request.params as { address: string };
      const api = await blockchainService.getApi();

      // Query all sales for this seller
      const allSales = await api.query.bazariCommerce.sales.entries();

      let totalPaid = 0;
      let thisMonth = 0;
      let thisMonthCount = 0;
      let totalSales = 0;
      const affiliateEarnings = new Map<string, number>();

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime() / 1000;

      for (const [key, saleOpt] of allSales) {
        if (saleOpt.isNone) continue;

        const sale = saleOpt.unwrap();
        const saleJson = sale.toJSON() as any;

        // Filter by seller
        if (saleJson.seller !== address) continue;

        totalSales++;
        const commission = parseInt(saleJson.commissionPaid || '0', 10);
        totalPaid += commission;

        // Check if this month
        if (saleJson.createdAt >= monthStart) {
          thisMonth += commission;
          thisMonthCount++;
        }
      }

      // Query affiliate earnings from CommissionRecorded events
      const events = await api.query.system.events();

      events.forEach((record) => {
        const { event } = record;

        if (api.events.bazariCommerce.CommissionRecorded.is(event)) {
          const [saleId, recipient, amount, commissionType] = event.data;
          const typeStr = commissionType.toString().toLowerCase();

          if (typeStr === 'affiliate') {
            const recipientStr = recipient.toString();
            const amountNum = parseInt((amount as any).toString(), 10);
            affiliateEarnings.set(
              recipientStr,
              (affiliateEarnings.get(recipientStr) || 0) + amountNum
            );
          }
        }
      });

      // Find top affiliate
      let topAffiliate = null;
      if (affiliateEarnings.size > 0) {
        const sorted = Array.from(affiliateEarnings.entries()).sort((a, b) => b[1] - a[1]);
        topAffiliate = {
          address: sorted[0][0],
          totalEarned: sorted[0][1],
        };
      }

      return {
        totalPaid,
        thisMonth,
        thisMonthCount,
        avgPerSale: totalSales > 0 ? Math.floor(totalPaid / totalSales) : 0,
        totalSales,
        topAffiliate,
      };
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch commission stats' });
    }
  });

  // ============================================================================
  // GET /api/seller/:address/commissions
  // Get commission history for a seller
  // ============================================================================
  app.get('/seller/:address/commissions', { preHandler: authOnRequest }, async (request, reply) => {
    try {
      const { address } = request.params as { address: string };
      const { limit = 100, offset = 0 } = request.query as { limit?: number; offset?: number };
      const api = await blockchainService.getApi();

      // Query all sales for this seller
      const allSales = await api.query.bazariCommerce.sales.entries();
      const sellerSaleIds = new Set<number>();

      for (const [key, saleOpt] of allSales) {
        if (saleOpt.isNone) continue;

        const sale = saleOpt.unwrap();
        const saleJson = sale.toJSON() as any;

        if (saleJson.seller === address) {
          const saleId = parseInt((key.args[0] as any).toString(), 10);
          sellerSaleIds.add(saleId);
        }
      }

      // Query CommissionRecorded events
      const events = await api.query.system.events();
      const commissions: any[] = [];

      events.forEach((record) => {
        const { event } = record;

        if (api.events.bazariCommerce.CommissionRecorded.is(event)) {
          const [saleId, recipient, amount, commissionType, level] = event.data;
          const saleIdNum = (saleId as any).toNumber();

          // Filter by seller's sales
          if (sellerSaleIds.has(saleIdNum)) {
            commissions.push({
              saleId: saleIdNum,
              recipient: recipient.toString(),
              amount: (amount as any).toString(),
              type: commissionType.toString().toLowerCase(),
              level: level.isSome ? (level.unwrap() as any).toNumber() : null,
              timestamp: record.phase.isApplyExtrinsic
                ? Date.now() / 1000
                : null,
            });
          }
        }
      });

      // Sort by timestamp descending and apply pagination
      const sorted = commissions.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      const paginated = sorted.slice(offset, offset + limit);

      return {
        commissions: paginated,
        total: commissions.length,
        limit,
        offset,
      };
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch commission history' });
    }
  });

  // ============================================================================
  // GET /api/seller/:address/commission-trends
  // Get commission trends over time (time-series data for charts)
  // ============================================================================
  app.get('/seller/:address/commission-trends', { preHandler: authOnRequest }, async (request, reply) => {
    try {
      const { address } = request.params as { address: string };
      const { days = 30 } = request.query as { days?: number };
      const api = await blockchainService.getApi();

      // Query all sales for this seller
      const allSales = await api.query.bazariCommerce.sales.entries();
      const sellerSaleIds = new Set<number>();
      const saleTimestamps = new Map<number, number>();

      for (const [key, saleOpt] of allSales) {
        if (saleOpt.isNone) continue;

        const sale = saleOpt.unwrap();
        const saleJson = sale.toJSON() as any;

        if (saleJson.seller === address) {
          const saleId = parseInt((key.args[0] as any).toString(), 10);
          sellerSaleIds.add(saleId);
          saleTimestamps.set(saleId, saleJson.createdAt);
        }
      }

      // Query CommissionRecorded events
      const events = await api.query.system.events();
      const dailyData = new Map<string, { total: number; platform: number; affiliate: number; count: number }>();

      const cutoffTime = Date.now() / 1000 - (days * 24 * 60 * 60);

      events.forEach((record) => {
        const { event } = record;

        if (api.events.bazariCommerce.CommissionRecorded.is(event)) {
          const [saleId, recipient, amount, commissionType] = event.data;
          const saleIdNum = (saleId as any).toNumber();

          // Filter by seller's sales
          if (!sellerSaleIds.has(saleIdNum)) return;

          const timestamp = saleTimestamps.get(saleIdNum);
          if (!timestamp || timestamp < cutoffTime) return;

          // Group by date
          const date = new Date(timestamp * 1000).toISOString().split('T')[0];
          const amountNum = parseInt((amount as any).toString(), 10);
          const type = commissionType.toString().toLowerCase();

          if (!dailyData.has(date)) {
            dailyData.set(date, { total: 0, platform: 0, affiliate: 0, count: 0 });
          }

          const dayData = dailyData.get(date)!;
          dayData.total += amountNum;
          dayData.count++;

          if (type === 'platform') {
            dayData.platform += amountNum;
          } else if (type === 'affiliate') {
            dayData.affiliate += amountNum;
          }
        }
      });

      // Convert to array and fill missing dates
      const trends: any[] = [];
      const today = new Date();

      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        const data = dailyData.get(dateStr) || { total: 0, platform: 0, affiliate: 0, count: 0 };
        trends.push({
          date: dateStr,
          total: data.total,
          platform: data.platform,
          affiliate: data.affiliate,
          count: data.count,
        });
      }

      return trends;
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch commission trends' });
    }
  });
}
// @ts-nocheck
