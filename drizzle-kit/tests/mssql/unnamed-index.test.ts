import { is } from 'drizzle-orm';
import { index, int, MsSqlTable, mssqlTable, varchar } from 'drizzle-orm/mssql-core';
import { mssqlSchemaError } from 'src/cli/views';
import { interimToDDL } from 'src/dialects/mssql/ddl';
import { fromDrizzleSchema } from 'src/dialects/mssql/drizzle';
import { describe, expect, test } from 'vitest';

function schemaToErrors(schema: Record<string, unknown>) {
	const tables = Object.values(schema).filter((it) => is(it, MsSqlTable)) as MsSqlTable[];
	const { schema: interim, errors: schemaErrors } = fromDrizzleSchema(
		{ schemas: [], tables, views: [] },
		() => true,
	);
	const { ddl, errors: ddlErrors } = interimToDDL(interim);
	return { schemaErrors, ddlErrors, ddl };
}

describe('unnamed indexes', () => {
	test('generate rejects an index without a name', () => {
		const schema = {
			users: mssqlTable('users', {
				id: int('id').primaryKey(),
				name: varchar('name', { length: 256 }),
			}, (t) => [
				// @ts-expect-error index name is required
				index().on(t.name),
			]),
		};

		const { schemaErrors, ddlErrors, ddl } = schemaToErrors(schema);

		expect(schemaErrors).toStrictEqual([{
			type: 'index_no_name',
			schema: 'dbo',
			table: 'users',
		}]);
		expect(ddlErrors).toStrictEqual([]);
		expect(ddl.indexes.list()).toStrictEqual([]);
		expect(mssqlSchemaError(schemaErrors[0]!)).toContain('users');
		expect(mssqlSchemaError(schemaErrors[0]!)).toContain('Please specify an index name');
		expect(mssqlSchemaError(schemaErrors[0]!)).not.toContain('undefined');
	});

	test('generate reports each unnamed index instead of a duplicate undefined name', () => {
		const schema = {
			users: mssqlTable('users', {
				id: int('id').primaryKey(),
				name: varchar('name', { length: 256 }),
				email: varchar('email', { length: 256 }),
			}, (t) => [
				// @ts-expect-error index name is required
				index().on(t.name),
				// @ts-expect-error index name is required
				index().on(t.email),
			]),
		};

		const { schemaErrors, ddl, ddlErrors } = schemaToErrors(schema);

		expect(schemaErrors).toStrictEqual([
			{ type: 'index_no_name', schema: 'dbo', table: 'users' },
			{ type: 'index_no_name', schema: 'dbo', table: 'users' },
		]);
		expect(ddlErrors).toStrictEqual([]);
		expect(ddl.indexes.list()).toStrictEqual([]);
		expect(schemaErrors.every((error) => !mssqlSchemaError(error).includes('undefined'))).toBe(true);
	});
});
