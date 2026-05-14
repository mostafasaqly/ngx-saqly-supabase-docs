import { Component } from '@angular/core';
import { DocPage } from '../shared/doc-page';
import { CodeBlock } from '../shared/code-block';

@Component({
  selector: 'relations-page',
  standalone: true,
  imports: [DocPage, CodeBlock],
  template: `
    <doc-page title="Relations" lead="Relations add foreign key constraints to the database via migrations.">

      <h2>One-to-One</h2>
      <code-block lang="ts" [code]="oneOne" />

      <h2>One-to-Many</h2>
      <code-block lang="ts" [code]="oneMany" />

      <h2>Many-to-One</h2>
      <code-block lang="ts" [code]="manyOne" />

      <h2>Many-to-Many (via junction table)</h2>
      <code-block lang="ts" [code]="manyMany" />
      <p>Query the junction in one request:</p>
      <code-block lang="ts" [code]="manyManyQuery" />

      <h2><code>onDelete</code> / <code>onUpdate</code></h2>
      <table>
        <thead><tr><th>Value</th><th>Effect</th></tr></thead>
        <tbody>
          <tr><td><code>'cascade'</code></td><td>Delete/update child rows automatically</td></tr>
          <tr><td><code>'restrict'</code></td><td>Prevent delete/update if children exist</td></tr>
          <tr><td><code>'set null'</code></td><td>Set FK to NULL on parent delete</td></tr>
          <tr><td><code>'no action'</code></td><td>Default — error if constraint violated</td></tr>
        </tbody>
      </table>
    </doc-page>
  `,
})
export class RelationsPage {
  readonly oneOne = `import { relation } from 'ngx-saqly-supabase';

const UserProfileRelation = relation.oneToOne(ProfilesTable, UsersTable, {
  localKey: 'user_id',
  foreignKey: 'id',
  onDelete: 'cascade',
});`;

  readonly oneMany = `const CategoryProductsRelation = relation.oneToMany(CategoriesTable, ProductsTable, {
  localKey: 'id',
  foreignKey: 'category_id',
});`;

  readonly manyOne = `const ProductCategoryRelation = relation.manyToOne(ProductsTable, CategoriesTable, {
  localKey: 'category_id',
  foreignKey: 'id',
  onDelete: 'set null',
});`;

  readonly manyMany = `export const ProductTagsTable = defineSchema('product_tags', {
  product_id: field.bigint().required(),
  tag_id:     field.bigint().required(),
});

const ToProduct = relation.manyToOne(ProductTagsTable, ProductsTable, {
  localKey: 'product_id', foreignKey: 'id', onDelete: 'cascade',
});

const ToTag = relation.manyToOne(ProductTagsTable, TagsTable, {
  localKey: 'tag_id', foreignKey: 'id', onDelete: 'cascade',
});`;

  readonly manyManyQuery = `const products = await repo.findMany({
  select: 'id, name, tags:product_tags(tag:tags(id, name))',
});`;
}
