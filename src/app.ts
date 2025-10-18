
import knex, { migrate, seed } from "#postgres/knex.js";
import { startTariffSyncJob } from './utils/scheduler.js';
import { syncTariffsToSheets } from './services/googleSheetsService.js';
import { fetchAndStoreBoxTariffs } from './services/wbTariffsService';

await migrate.latest();
await seed.run();
await fetchAndStoreBoxTariffs(knex, process.env.WB_API_TOKEN || '');

console.log("All migrations and seeds have been run");

startTariffSyncJob();

// Однократная отправка тарифов в Google Sheets при старте
syncTariffsToSheets(knex)
	.then(() => console.log('✅ Tariffs sent to Google Sheets'))
	.catch(e => console.error('❌ Error sending tariffs to Google Sheets:', e));