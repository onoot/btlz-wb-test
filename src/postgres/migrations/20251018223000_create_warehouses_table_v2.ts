import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('warehouses', (table) => {
    table.increments('id').primary();
    table.string('name').notNullable().unique();
    table.integer('external_id').notNullable().defaultTo(0); 
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('warehouses');
}
