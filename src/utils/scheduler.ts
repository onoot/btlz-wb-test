import { CronJob } from 'cron';
import { fetchAndStoreBoxTariffs } from '../services/wbTariffsService';
import env from '../config/env/env';
import knex from "#postgres/knex.js";

export const startTariffSyncJob = () => {
  if (!env.WB_API_TOKEN) {
    console.warn('WB_API_TOKEN not set — tariff sync disabled');
    return;
  }

  const job = new CronJob('0 * * * * *', async () => {
    await fetchAndStoreBoxTariffs(knex, env.WB_API_TOKEN);
  });

  job.start();
  console.log('✅ Tariff sync job started (runs hourly)');
};