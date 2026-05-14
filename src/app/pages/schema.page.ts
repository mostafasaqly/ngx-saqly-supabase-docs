import { Component } from '@angular/core';
import { DocPage } from '../shared/doc-page';
import { CodeBlock } from '../shared/code-block';

@Component({
  selector: 'schema-page',
  standalone: true,
  imports: [DocPage, CodeBlock],
  template: `
    <doc-page eyebrow="Step 1" title="Define Your Schema" lead="Define a database table and its columns in TypeScript. Row types are inferred — no interface needed.">

      <h2><code>defineSchema(tableName, fields)</code></h2>
      <code-block lang="ts" filename="src/app/schema/product.ts" [code]="schemaCode" />

      <h2>Field Types</h2>
      <table>
        <thead><tr><th>Builder</th><th>PostgreSQL</th><th>TypeScript</th></tr></thead>
        <tbody>
          <tr><td><code>field.string()</code></td><td><code>text</code></td><td><code>string</code></td></tr>
          <tr><td><code>field.text()</code></td><td><code>text</code></td><td><code>string</code></td></tr>
          <tr><td><code>field.uuid()</code></td><td><code>uuid</code></td><td><code>string</code></td></tr>
          <tr><td><code>field.integer()</code></td><td><code>integer</code></td><td><code>number</code></td></tr>
          <tr><td><code>field.bigint()</code></td><td><code>bigint</code></td><td><code>number</code></td></tr>
          <tr><td><code>field.boolean()</code></td><td><code>boolean</code></td><td><code>boolean</code></td></tr>
          <tr><td><code>field.timestamp()</code></td><td><code>timestamp with time zone</code></td><td><code>string</code></td></tr>
          <tr><td><code>field.jsonb()</code></td><td><code>jsonb</code></td><td><code>unknown</code></td></tr>
        </tbody>
      </table>

      <h2>Field Modifiers</h2>
      <table>
        <thead><tr><th>Modifier</th><th>SQL Effect</th><th>TypeScript Effect</th></tr></thead>
        <tbody>
          <tr><td><code>.required()</code></td><td><code>NOT NULL</code></td><td>required property</td></tr>
          <tr><td><code>.nullable()</code></td><td>allow NULL</td><td>optional property</td></tr>
          <tr><td><code>.primary()</code></td><td><code>PRIMARY KEY</code></td><td>required property</td></tr>
          <tr><td><code>.primaryGenerated()</code></td><td><code>GENERATED ... PRIMARY KEY</code></td><td>required property</td></tr>
          <tr><td><code>.unique()</code></td><td><code>UNIQUE</code></td><td>no change</td></tr>
          <tr><td><code>.default('value')</code></td><td><code>DEFAULT value</code></td><td>required property</td></tr>
          <tr><td><code>.defaultNow()</code></td><td><code>DEFAULT now()</code></td><td>required property</td></tr>
          <tr><td><code>.references(table, col)</code></td><td>inline <code>REFERENCES</code></td><td>no change</td></tr>
        </tbody>
      </table>

      <h2>Type Inference Rules</h2>
      <p>The TypeScript type of each row is inferred automatically by <code>InferModel</code>:</p>
      <code-block lang="ts" [code]="inferCode" />

      <div class="callout">
        <strong>Quick check</strong>
        <p>Hover the <code>InferModel</code> type in your IDE — the inferred shape is exactly what the row looks like when you read it.</p>
      </div>
    </doc-page>
  `,
})
export class SchemaPage {
  readonly schemaCode = `import { defineSchema, defineModel, field, InferModel } from 'ngx-saqly-supabase';

export const ProductsTable = defineSchema('products', {
  id:          field.bigint().primaryGenerated(),   // auto-generated PK
  name:        field.string().required(),           // NOT NULL
  price:       field.integer().required(),          // NOT NULL
  stock:       field.integer().default('0'),        // always present (has default)
  description: field.string(),                      // nullable — optional
  created_at:  field.timestamp().defaultNow(),
});

export type Product = InferModel<typeof ProductsTable>;
// → { id: number; name: string; price: number; stock: number;
//     description?: string; created_at: string }

export const ProductModel = defineModel(ProductsTable);`;

  readonly inferCode = `// REQUIRED in TypeScript (always present when reading)
id:         field.bigint().primaryGenerated()  // auto-generated
name:       field.string().required()          // NOT NULL
status:     field.string().default(\`'open'\`)   // has DB default
created_at: field.timestamp().defaultNow()     // has DB default

// OPTIONAL in TypeScript (can be NULL)
notes:      field.string()   // → string | undefined`;
}
