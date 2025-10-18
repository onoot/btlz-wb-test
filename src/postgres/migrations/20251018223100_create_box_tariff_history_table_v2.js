
/**
 * @param {{ schema: { createTable: (arg0: string, arg1: (table: any) => void) => any; }; }} knex
 */
export async function up(knex) {
    await knex.schema.createTable('box_tariff_history', (table) => {
        table.integer('warehouse_id').notNullable();
        table.string('tariff_type').notNullable();
        table.date('valid_from').notNullable();
        table.decimal('coef', 10, 4).notNullable();
        table.primary(['warehouse_id', 'tariff_type', 'valid_from']);
        table.foreign('warehouse_id').references('warehouses.id').onDelete('CASCADE');
    });
}

/**
 * @param {{ schema: { dropTableIfExists: (arg0: string) => any; }; }} knex
 */
export async function down(knex) {
    await knex.schema.dropTableIfExists('box_tariff_history');
}
