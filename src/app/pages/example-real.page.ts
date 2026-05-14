import { Component } from '@angular/core';
import { DocPage } from '../shared/doc-page';
import { CodeBlock } from '../shared/code-block';

@Component({
  selector: 'example-real-page',
  standalone: true,
  imports: [DocPage, CodeBlock],
  template: `
    <doc-page eyebrow="Example" title="Users · Products · Categories" lead="A multi-table schema split across separate files — the recommended structure for real projects.">

      <h2>File structure</h2>
      <code-block lang="text" [code]="tree" />

      <h2>1. <code>schema/user.ts</code></h2>
      <code-block lang="ts" filename="schema/user.ts" [code]="userCode" />

      <h2>2. <code>schema/category.ts</code></h2>
      <code-block lang="ts" filename="schema/category.ts" [code]="categoryCode" />

      <h2>3. <code>schema/product.ts</code></h2>
      <p>Imports from <code>user.ts</code> and <code>category.ts</code> and wires foreign keys with <code>relation.manyToOne</code>.</p>
      <code-block lang="ts" filename="schema/product.ts" [code]="productCode" />

      <h2>4. <code>schema/migrations.ts</code></h2>
      <p>Group every table, relation, RLS, and policy into one <code>MigrationDefinition</code> so generated SQL is deduplicated.</p>
      <code-block lang="ts" filename="schema/migrations.ts" [code]="migCode" />

      <h2>5. Query the joined data</h2>
      <code-block lang="ts" [code]="queryCode" />
    </doc-page>
  `,
})
export class ExampleRealPage {
  readonly tree = `src/
├── environments/environment.ts
├── app.config.ts
├── app.component.ts
├── schema/
│   ├── user.ts
│   ├── category.ts
│   ├── product.ts        ← imports from user.ts and category.ts
│   └── migrations.ts
└── products/
    ├── products.component.ts
    └── admin-migration.component.ts`;

  readonly userCode = `import { defineSchema, defineModel, field, policy, InferModel } from 'ngx-saqly-supabase';

export const UsersTable = defineSchema('users', {
  id:         field.uuid().primary(),
  full_name:  field.string().required(),
  email:      field.string().required().unique(),
  created_at: field.timestamp().defaultNow(),
});

export type User = InferModel<typeof UsersTable>;
export const UserModel = defineModel(UsersTable);

export const ReadUsersPolicy = policy.select('read users')
  .on(UsersTable).to('anon', 'authenticated').using('true').build();

export const InsertUsersPolicy = policy.insert('insert users')
  .on(UsersTable).to('anon', 'authenticated').withCheck('true').build();`;

  readonly categoryCode = `import { defineSchema, defineModel, field, policy, InferModel } from 'ngx-saqly-supabase';

export const CategoriesTable = defineSchema('categories', {
  id:   field.bigint().primaryGenerated(),
  name: field.string().required().unique(),
});

export type Category = InferModel<typeof CategoriesTable>;
export const CategoryModel = defineModel(CategoriesTable);

export const ReadCategoriesPolicy = policy.select('read categories')
  .on(CategoriesTable).to('anon', 'authenticated').using('true').build();

export const InsertCategoriesPolicy = policy.insert('insert categories')
  .on(CategoriesTable).to('anon', 'authenticated').withCheck('true').build();`;

  readonly productCode = `import { defineSchema, defineModel, field, policy, relation, InferModel } from 'ngx-saqly-supabase';
import { UsersTable } from './user';
import { CategoriesTable } from './category';

export const ProductsTable = defineSchema('products', {
  id:          field.bigint().primaryGenerated(),
  name:        field.string().required(),
  price:       field.integer().required(),
  stock:       field.integer().default('0'),
  user_id:     field.uuid().required(),
  category_id: field.bigint(),
  created_at:  field.timestamp().defaultNow(),
});

export type Product = InferModel<typeof ProductsTable>;
export const ProductModel = defineModel(ProductsTable);

export const ProductUserRelation = relation.manyToOne(ProductsTable, UsersTable, {
  localKey: 'user_id', foreignKey: 'id', onDelete: 'cascade',
});

export const ProductCategoryRelation = relation.manyToOne(ProductsTable, CategoriesTable, {
  localKey: 'category_id', foreignKey: 'id', onDelete: 'set null',
});

export const ReadProductsPolicy = policy.select('read products')
  .on(ProductsTable).to('anon', 'authenticated').using('true').build();`;

  readonly migCode = `import { MigrationDefinition } from 'ngx-saqly-supabase';
import { UsersTable, ReadUsersPolicy, InsertUsersPolicy } from './user';
import { CategoriesTable, ReadCategoriesPolicy, InsertCategoriesPolicy } from './category';
import { ProductsTable, ProductUserRelation, ProductCategoryRelation, ReadProductsPolicy } from './product';

export const initialMigration: MigrationDefinition = {
  name: 'initial-schema',
  tables: [UsersTable, CategoriesTable, ProductsTable],
  relations: [ProductUserRelation, ProductCategoryRelation],
  rls: [UsersTable, CategoriesTable, ProductsTable],
  policies: [
    ReadUsersPolicy, InsertUsersPolicy,
    ReadCategoriesPolicy, InsertCategoriesPolicy,
    ReadProductsPolicy,
  ],
};`;

  readonly queryCode = `const products = await repo.findMany({
  select: 'id, name, price, owner:users(id, full_name), category:categories(id, name)',
  orderBy: 'created_at',
  ascending: false,
});`;
}
