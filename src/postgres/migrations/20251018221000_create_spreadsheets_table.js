/**
 * @param {{ schema: { createTable: (arg0: string, arg1: (table: any) => void) => any; }; fn: { now: () => any; }; }} knex
 */
export async function up(knex) {
    await knex.schema.createTable('spreadsheets', (/** @type {{ string: (arg0: string) => { (): any; new (): any; primary: { (): void; new (): any; }; }; timestamp: (arg0: string) => { (): any; new (): any; defaultTo: { (arg0: any): void; new (): any; }; }; }} */ table) => {
        table.string('spreadsheet_id').primary();
        table.timestamp('created_at').defaultTo(knex.fn.now());
    });
}
/**
 * @param {{ schema: { dropTableIfExists: (arg0: string) => any; }; }} knex
 */
export async function down(knex) {
    await knex.schema.dropTableIfExists('spreadsheets');
}
