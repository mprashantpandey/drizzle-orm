import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { sqliteSchemaError } from 'src/cli/views';
import { describe, expect, test } from 'vitest';
import { drizzleToDDL } from './mocks';

describe('unnamed indexes', () => {
	test('generate rejects an index without a name', () => {
		const schema = {
			users: sqliteTable('users', {
				id: integer('id').primaryKey(),
				name: text('name'),
			}, (t) => [
				// @ts-expect-error index name is required
				index().on(t.name),
			]),
		};

		const { ddl, errors } = drizzleToDDL(schema);

		expect(errors).toStrictEqual([{ type: 'index_no_name', table: 'users' }]);
		expect(ddl.indexes.list()).toStrictEqual([]);
		expect(sqliteSchemaError(errors[0]!)).toContain('users');
		expect(sqliteSchemaError(errors[0]!)).toContain('Please specify an index name');
	});

	test('generate reports each unnamed index instead of a duplicate undefined name', () => {
		const schema = {
			users: sqliteTable('users', {
				id: integer('id').primaryKey(),
				name: text('name'),
				email: text('email'),
			}, (t) => [
				// @ts-expect-error index name is required
				index().on(t.name),
				// @ts-expect-error index name is required
				index().on(t.email),
			]),
		};

		const { ddl, errors } = drizzleToDDL(schema);

		expect(errors).toStrictEqual([
			{ type: 'index_no_name', table: 'users' },
			{ type: 'index_no_name', table: 'users' },
		]);
		expect(ddl.indexes.list()).toStrictEqual([]);
		expect(errors.every((error) => !sqliteSchemaError(error).includes('undefined'))).toBe(true);
	});
});
