import axios from 'axios';
import type { Knex } from 'knex';
//@ts-ignore

import { logger } from '../utils/logger.js';

const WB_TARIFFS_URL = 'https://common-api.wildberries.ru/api/v1/tariffs/box';

export interface BoxTariff {
  warehouseName: string;
  warehouseId: number;
  deliveryType: string;
  coef: number;
}

export async function fetchAndStoreBoxTariffs(knex: Knex, wbToken: string): Promise<void> {
  const today = new Date().toISOString().split('T')[0];


  try {
    const response = await axios.get(WB_TARIFFS_URL, {
      headers: { Authorization: wbToken },
      params: { date: today },
      timeout: 10000,
    });

    logger.info('WB API raw response received', {
      status: response.status,
      warehouseCount: response.data?.response?.data?.warehouseList?.length || 0,
    });

    const warehouseList = response.data?.response?.data?.warehouseList;
    if (!Array.isArray(warehouseList) || warehouseList.length === 0) {
      logger.warn(`No warehouse data returned from WB API for date ${today}`);
      return;
    }

    const tariffs: { warehouseName: string; warehouseId: number; tariffType: string; coef: number }[] = [];

    for (const wh of warehouseList) {
      const { warehouseName, warehouseId = 0 } = wh;

      const deliveryCoefStr = wh.boxDeliveryCoefExpr;
      if (deliveryCoefStr && deliveryCoefStr !== '-') {
        const deliveryCoef = parseFloat(deliveryCoefStr.toString().replace(',', '.'));
        if (!isNaN(deliveryCoef)) {
          tariffs.push({
            warehouseName,
            warehouseId,
            tariffType: 'delivery',
            coef: deliveryCoef,
          });
        } else {
          logger.warn(`Invalid delivery coefficient for ${warehouseName}: ${deliveryCoefStr}`);
        }
      }

      const storageCoefStr = wh.boxStorageCoefExpr;
      if (storageCoefStr && storageCoefStr !== '-') {
        const storageCoef = parseFloat(storageCoefStr.toString().replace(',', '.'));
        if (!isNaN(storageCoef)) {
          tariffs.push({
            warehouseName,
            warehouseId,
            tariffType: 'storage',
            coef: storageCoef,
          });
        } else {
          logger.warn(`Invalid storage coefficient for ${warehouseName}: ${storageCoefStr}`);
        }
      }
    }

    if (tariffs.length === 0) {
      logger.warn('No valid tariff entries extracted from WB response');
      return;
    }

    const trx = await knex.transaction();
    try {
      let savedCount = 0;
      for (const t of tariffs) {
        // 1. Добавляем склад, если его нет
        let warehouseRow = await trx('warehouses')
          .where({ name: t.warehouseName })
          .first();
        if (!warehouseRow) {
          const [newId] = await trx('warehouses')
            .insert({ name: t.warehouseName, external_id: t.warehouseId })
            .returning('id');
          warehouseRow = { id: typeof newId === 'object' ? newId.id : newId, name: t.warehouseName, external_id: t.warehouseId };
        }

        // 2. Получаем последний тариф для склада и типа
        const last = await trx('box_tariff_history')
          .where({ warehouse_id: warehouseRow.id, tariff_type: t.tariffType })
          .orderBy('valid_from', 'desc')
          .first();

        if (!last || Number(last.coef) !== t.coef) {
          await trx('box_tariff_history').insert({
            warehouse_id: warehouseRow.id,
            tariff_type: t.tariffType,
            valid_from: today,
            coef: t.coef,
          });
          savedCount++;
        }
      }
      await trx.commit();
      logger.info(`✅ Saved/updated ${savedCount} box tariff history records for ${today}`);
    } catch (dbError) {
      await trx.rollback();
      logger.error('Database transaction failed:', dbError);
      throw new Error(`DB error: ${dbError instanceof Error ? dbError.message : 'unknown'}`);
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const message = error.response?.data?.detail || error.message;
      logger.error(`WB API error (${status}): ${message}`);
      if (error.response?.data) {
        logger.debug('WB API error payload:', error.response.data);
      }
    } else if (error instanceof Error) {
      logger.error('Unexpected error in fetchAndStoreBoxTariffs:', error.message);
    } else {
      logger.error('Unknown error in fetchAndStoreBoxTariffs:', error);
    }
    throw error;
  }
}