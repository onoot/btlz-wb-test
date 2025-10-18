import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('box_tariff_history', (table) => {
    table.integer('warehouse_id').notNullable();
    table.string('tariff_type').notNullable(); 
    table.date('valid_from').notNullable();
    table.decimal('coef', 10, 4).notNullable();
    table.primary(['warehouse_id', 'tariff_type', 'valid_from']);
    table.foreign('warehouse_id').references('warehouses.id').onDelete('CASCADE');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('box_tariff_history');
}
