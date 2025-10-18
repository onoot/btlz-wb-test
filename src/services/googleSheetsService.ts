import { google, sheets_v4 } from 'googleapis';
import { Knex } from 'knex';
import env from '../config/env/env';
import { logger } from '../utils/logger';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const list = env.page||'Лист1';
export async function syncTariffsToSheets(knex: Knex): Promise<void> {
  const sheetIdsRaw = env.GOOGLE_SHEET_IDS;
  if (!sheetIdsRaw) {
    logger.warn('GOOGLE_SHEET_IDS not configured — skipping Google Sheets sync');
    return;
  }

  const email = env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = env.GOOGLE_PRIVATE_KEY;

  if (!email || !privateKey) {
    logger.error('Missing Google Service Account credentials');
    return;
  }

  try {
    const auth = new google.auth.JWT({
      email,
      key: privateKey.replace(/\\n/g, '\n'),
      scopes: SCOPES,
    });

    const sheets = google.sheets({ version: 'v4', auth });


    const historyRows = await knex('box_tariff_history as h')
      .join('warehouses as w', 'h.warehouse_id', 'w.id')
      .select(
        'w.name as warehouse',
        'w.external_id as warehouseId',
        'h.tariff_type as tariffType',
        'h.valid_from',
        'h.coef'
      )
      .orderBy(['w.name', 'h.tariff_type', 'h.valid_from']);

    if (historyRows.length === 0) {
      logger.warn('No tariff history found in database — nothing to sync');
      return;
    }

    const values = [
      ['Склад', 'ID склада', 'Тип тарифа', 'Дата начала', 'Коэффициент'],
      ...historyRows.map(t => [t.warehouse, t.warehouseId, t.tariffType, t.valid_from, t.coef]),
    ];

    const sheetIds = sheetIdsRaw.split(',').map(id => id.trim());

    for (const originalSheetId of sheetIds) {
      let spreadsheetId = originalSheetId;

      try {
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: list+'!A1',
          valueInputOption: 'RAW',
          requestBody: { values },
        });
        logger.info(`✅ Updated Google Sheet: ${spreadsheetId}`);
        continue; 
      } catch (error: any) {
        const code = error.code || (error.response?.status ?? null);
        if (code === 404) {
          logger.warn(`Table or sheet not found for ID: ${originalSheetId}. Creating new spreadsheet...`);
        } else {
          logger.error(`❌ Failed to update Google Sheet ${originalSheetId}:`, {
            message: error.message,
            code,
          });
          continue;
        }
      }

      try {
        const createResponse = await sheets.spreadsheets.create({
          requestBody: {
            properties: {
              title: 'WB Tariffs - Auto Created',
            },
            sheets: [{ properties: { title: 'stocks_coefs' } }],
          },
        });

        const newSpreadsheetId = createResponse.data.spreadsheetId;
        if (!newSpreadsheetId) throw new Error('Failed to create spreadsheet');

        logger.info(`🆕 Created new Google Sheet: https://docs.google.com/spreadsheets/d/${newSpreadsheetId}`);
        logger.warn(`❗ Replace '${originalSheetId}' with '${newSpreadsheetId}' in GOOGLE_SHEET_IDS in .env`);

        // Записываем данные в новую таблицу
        await sheets.spreadsheets.values.update({
          spreadsheetId: newSpreadsheetId,
          range: 'stocks_coefs!A1',
          valueInputOption: 'RAW',
          requestBody: { values },
        });

        logger.info(`✅ Data written to new sheet: ${newSpreadsheetId}`);
      } catch (createError: any) {
        logger.error(`❌ Failed to create or populate new Google Sheet:`, {
          message: createError.message,
          stack: createError.stack,
        });
      }
    }
  } catch (error: any) {
    logger.error('Critical error in syncTariffsToSheets:', {
      message: error.message,
      stack: error.stack,
    });
  }
}