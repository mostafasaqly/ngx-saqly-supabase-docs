import { Component } from '@angular/core';
import { DocPage } from '../shared/doc-page';
import { CodeBlock } from '../shared/code-block';

@Component({
  selector: 'crud-page',
  standalone: true,
  imports: [DocPage, CodeBlock],
  template: `
    <doc-page eyebrow="Step 3" title="CRUD Operations" lead="Inject a repository and perform reads, writes, deletes, and aggregations with a fully typed API.">

      <h2>Inject the repository</h2>
      <code-block lang="ts" [code]="injectCode" />

      <h2>Read</h2>
      <code-block lang="ts" [code]="readCode" />

      <h2>Write</h2>
      <p>All write methods accept <code>WritePayload&lt;T&gt;</code> — a flat optional version of your model type. Every field is optional, so you only pass what you need.</p>
      <code-block lang="ts" [code]="writeCode" />

      <p>You can import <code>WritePayload&lt;T&gt;</code> to type a helper variable explicitly:</p>
      <code-block lang="ts" [code]="payloadCode" />

      <h2>Delete</h2>
      <code-block lang="ts" [code]="deleteCode" />

      <h2>Aggregate</h2>
      <code-block lang="ts" [code]="aggCode" />

      <div class="callout">
        <strong>All methods return <code>Promise&lt;T&gt;</code></strong>
        <p>Combine with Angular signals for a reactive UI. <code>await</code> in <code>ngOnInit</code>, then <code>this.products.set(...)</code>.</p>
      </div>
    </doc-page>
  `,
})
export class CrudPage {
  readonly injectCode = `import { injectModel } from 'ngx-saqly-supabase';
import { ProductModel } from './schema/product';

const repo = injectModel(ProductModel);`;

  readonly readCode = `// All rows
const all = await repo.findAll();

// With filters, ordering, pagination
const latest = await repo.findMany({
  where: { stock: 0 },
  orderBy: 'created_at',
  ascending: false,
  limit: 20,
  offset: 0,
});

// Select specific columns
const names = await repo.findMany({ select: 'id, name, price' });

// First match
const one = await repo.findFirst({ where: { name: 'Widget' } });

// By primary key
const byId = await repo.findById(42);`;

  readonly writeCode = `// Insert — returns the created record
const created = await repo.insert({ name: 'Widget', price: 999, stock: 50 });

// Insert many
const many = await repo.insertMany([
  { name: 'A', price: 10 },
  { name: 'B', price: 20 },
]);

// Upsert (insert or update by PK)
const upserted = await repo.upsert({ id: 1, name: 'Widget', price: 899 });

// Update by PK
const updated = await repo.updateById(1, { price: 799 });

// Update many rows matching a filter
await repo.updateMany({ stock: 0 }, { stock: 100 });`;

  readonly payloadCode = `import { WritePayload } from 'ngx-saqly-supabase';
import { Product } from './schema/product';

const payload: WritePayload<Product> = {
  name: 'Widget',
  price: 999,
};

await repo.insert(payload);`;

  readonly deleteCode = `await repo.deleteById(1);
await repo.deleteMany({ stock: 0 });`;

  readonly aggCode = `const total    = await repo.count();
const lowStock = await repo.count({ where: { stock: 0 } });
const exists   = await repo.exists({ where: { name: 'Widget' } });`;
}
