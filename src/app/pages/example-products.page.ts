import { Component } from '@angular/core';
import { DocPage } from '../shared/doc-page';
import { CodeBlock } from '../shared/code-block';

@Component({
  selector: 'example-products-page',
  standalone: true,
  imports: [DocPage, CodeBlock],
  template: `
    <doc-page eyebrow="Example" title="Products — full CRUD app" lead="A complete working app from schema to component — a single products table, step by step.">

      <h2>File structure</h2>
      <code-block lang="text" [code]="tree" />

      <h2>1. <code>schema/product.ts</code></h2>
      <p>Define the table, the model, the policies, and the migration — all in one file.</p>
      <code-block lang="ts" filename="schema/product.ts" [code]="schema" />

      <h2>2. <code>app.config.ts</code></h2>
      <p>Register Supabase and pass the migration. It runs once automatically — already-applied migrations are skipped on every subsequent start.</p>
      <code-block lang="ts" filename="app.config.ts" [code]="config" />

      <h2>3. <code>products/admin-migration.component.ts</code></h2>
      <p>Shows migration status on load. If <code>exec_sql</code> is not set up yet, it shows the one-time SQL to copy into the Supabase SQL Editor.</p>
      <code-block lang="ts" filename="admin-migration.component.ts" [code]="admin" />

      <h2>4. <code>products/products.component.ts</code></h2>
      <p>Full CRUD component — reads, inserts, updates, and deletes products.</p>
      <code-block lang="ts" filename="products.component.ts" [code]="comp" />

      <h2>5. <code>app.component.ts</code></h2>
      <code-block lang="ts" filename="app.component.ts" [code]="root" />
    </doc-page>
  `,
})
export class ExampleProductsPage {
  readonly tree = `src/
├── environments/
│   └── environment.ts
├── app.config.ts
├── app.component.ts
├── schema/
│   └── product.ts
└── products/
    ├── products.component.ts
    └── admin-migration.component.ts`;

  readonly schema = `import {
  defineSchema, defineModel, field, policy,
  InferModel, MigrationDefinition,
} from 'ngx-saqly-supabase';

// ── Table ────────────────────────────────────────────
export const ProductsTable = defineSchema('products', {
  id:          field.bigint().primaryGenerated(),
  name:        field.string().required(),
  price:       field.integer().required(),
  stock:       field.integer().default('0'),
  description: field.string(),
  created_at:  field.timestamp().defaultNow(),
});

export type Product = InferModel<typeof ProductsTable>;
export const ProductModel = defineModel(ProductsTable);

// ── Policies ─────────────────────────────────────────
const PublicReadPolicy = policy.select('Anyone can read products')
  .on(ProductsTable).to('anon', 'authenticated').using('true').build();

const PublicInsertPolicy = policy.insert('Anyone can insert products')
  .on(ProductsTable).to('anon', 'authenticated').withCheck('true').build();

const PublicUpdatePolicy = policy.update('Anyone can update products')
  .on(ProductsTable).to('anon', 'authenticated')
  .using('true').withCheck('true').build();

const PublicDeletePolicy = policy.delete('Anyone can delete products')
  .on(ProductsTable).to('anon', 'authenticated').using('true').build();

// ── Migration ────────────────────────────────────────
export const productsMigration: MigrationDefinition = {
  name: 'create-products-table',
  tables:   [ProductsTable],
  rls:      [ProductsTable],
  policies: [PublicReadPolicy, PublicInsertPolicy, PublicUpdatePolicy, PublicDeletePolicy],
};`;

  readonly config = `import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideSaqlySupabase } from 'ngx-saqly-supabase';
import { environment } from '../environments/environment';
import { productsMigration } from './schema/product';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideSaqlySupabase({
      url: environment.supabaseUrl,
      key: environment.supabaseAnonKey,
      migrations: [productsMigration],
    }),
  ],
};`;

  readonly admin = `import { Component, OnInit, signal } from '@angular/core';
import { injectMigration, MigrationRunner, MigrationRunResult } from 'ngx-saqly-supabase';
import { productsMigration } from '../schema/product';

const ALL_MIGRATIONS = [productsMigration];

@Component({
  selector: 'app-admin-migration',
  standalone: true,
  template: \`
    @if (setupReady() === false) {
      <div class="setup">
        <strong>⚠ One-time setup required</strong>
        <pre>{{ setupSql }}</pre>
        <button (click)="copySetupSql()">{{ copied() ? '✓ Copied!' : 'Copy SQL' }}</button>
        <button (click)="recheckSetup()">I've run it — re-check</button>
      </div>
    }

    @if (setupReady() === true) {
      <p>✓ exec_sql is ready</p>
    }

    @if (!loading() && pendingCount() > 0) {
      <p>{{ pendingCount() }} pending migration(s) — copy below into Supabase SQL Editor.</p>
      <pre>{{ sql() }}</pre>
    }
  \`,
})
export class AdminMigrationComponent implements OnInit {
  private readonly migration = injectMigration();

  readonly setupSql = MigrationRunner.setupSql();
  setupReady   = signal<boolean | null>(null);
  copied       = signal(false);
  loading      = signal(true);
  sql          = signal('');
  pendingCount = signal(0);

  async ngOnInit(): Promise<void> {
    this.setupReady.set(await this.migration.checkSetup());
    await this.loadPending();
  }

  async recheckSetup(): Promise<void> {
    this.setupReady.set(await this.migration.checkSetup());
    await this.loadPending();
  }

  copySetupSql(): void {
    navigator.clipboard.writeText(this.setupSql).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    });
  }

  private async loadPending(): Promise<void> {
    this.loading.set(true);
    const pending = await this.migration.getPending(ALL_MIGRATIONS);
    this.pendingCount.set(pending.length);
    this.sql.set(await this.migration.previewMany(ALL_MIGRATIONS));
    this.loading.set(false);
  }
}`;

  readonly comp = `import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { injectModel } from 'ngx-saqly-supabase';
import { Product, ProductModel } from '../schema/product';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [FormsModule],
  template: \`
    <h1>Products</h1>

    <input [(ngModel)]="name"        placeholder="Product name" />
    <input [(ngModel)]="price"       placeholder="Price"  type="number" />
    <input [(ngModel)]="stock"       placeholder="Stock"  type="number" />
    <textarea [(ngModel)]="description" placeholder="Description"></textarea>

    <button (click)="addProduct()">Add Product</button>
    <button (click)="loadProducts()">Reload</button>

    <h3>Total: {{ total() }}</h3>

    @for (product of products(); track product.id) {
      <div class="card">
        <h3>{{ product.name }}</h3>
        <p>Price: {{ product.price }}</p>
        <button (click)="updateProduct(product)">+10 Price</button>
        <button (click)="deleteProduct(product.id)">Delete</button>
      </div>
    }
  \`,
})
export class ProductsComponent implements OnInit {
  private readonly repo = injectModel(ProductModel);

  products = signal<Product[]>([]);
  total    = signal(0);

  name = ''; price = 0; stock = 0; description = '';

  async ngOnInit(): Promise<void> {
    await this.loadProducts();
    this.total.set(await this.repo.count());
  }

  async loadProducts(): Promise<void> {
    this.products.set(await this.repo.findMany({
      orderBy: 'created_at', ascending: false,
    }));
  }

  async addProduct(): Promise<void> {
    await this.repo.insert({
      name:  this.name.trim(),
      price: Number(this.price),
      stock: Number(this.stock),
      description: this.description.trim() || undefined,
    });
    this.name = ''; this.price = 0; this.stock = 0; this.description = '';
    await this.loadProducts();
  }

  async updateProduct(product: Product): Promise<void> {
    await this.repo.updateById(product.id, { price: product.price + 10 });
    await this.loadProducts();
  }

  async deleteProduct(id: number): Promise<void> {
    await this.repo.deleteById(id);
    await this.loadProducts();
  }
}`;

  readonly root = `import { Component } from '@angular/core';
import { ProductsComponent } from './products/products.component';
import { AdminMigrationComponent } from './products/admin-migration.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ProductsComponent, AdminMigrationComponent],
  template: \`
    <app-admin-migration />
    <app-products />
  \`,
})
export class App {}`;
}
