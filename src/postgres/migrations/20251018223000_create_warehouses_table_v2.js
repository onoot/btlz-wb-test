/**
 * @param {{ schema: { createTable: (arg0: string, arg1: (table: any) => void) => any; }; fn: { now: () => any; }; }} knex
 */
export async function up(knex) {
    await knex.schema.createTable('warehouses', (table) => {
        table.increments('id').primary();
        table.string('name').notNullable().unique();
        table.integer('external_id').notNullable().defaultTo(0);
        table.timestamp('created_at').defaultTo(knex.fn.now());
    });
}
/**
 * @param {{ schema: { dropTableIfExists: (arg0: string) => any; }; }} knex
 */
export async function down(knex) {
    await knex.schema.dropTableIfExists('warehouses');
}
