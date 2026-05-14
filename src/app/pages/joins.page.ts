import { Component } from '@angular/core';
import { DocPage } from '../shared/doc-page';
import { CodeBlock } from '../shared/code-block';

@Component({
  selector: 'joins-page',
  standalone: true,
  imports: [DocPage, CodeBlock],
  template: `
    <doc-page eyebrow="Step 4" title="Querying Across Tables (Joins)" lead="The select option passes directly to Supabase's PostgREST selector, which supports nested joins in a single request.">

      <h2>Syntax</h2>
      <code-block lang="text" [code]="syntaxCode" />

      <h2>Product with category</h2>
      <code-block lang="ts" [code]="ex1" />

      <h2>Product with category and owner</h2>
      <code-block lang="ts" [code]="ex2" />

      <h2>Nested — order → items → product</h2>
      <code-block lang="ts" [code]="ex3" />

      <div class="callout info">
        <strong>One round-trip</strong>
        <p>PostgREST resolves the entire nested graph in a single HTTP request. No N+1 queries.</p>
      </div>
    </doc-page>
  `,
})
export class JoinsPage {
  readonly syntaxCode = `column, foreignTable(col1, col2)          -- left join (null if no match)
column, foreignTable!inner(col1, col2)    -- inner join (excludes non-matches)
alias:foreignTable(col1, col2)            -- with alias`;

  readonly ex1 = `const products = await repo.findMany({
  select: 'id, name, price, category:categories(id, name)',
});
// [{ id: 1, name: 'Widget', category: { id: 3, name: 'Electronics' } }]`;

  readonly ex2 = `const products = await repo.findMany({
  select: 'id, name, price, category:categories(id, name), owner:users(id, full_name)',
});`;

  readonly ex3 = `const orders = await orderRepo.findMany({
  select: 'id, status, items:order_items(quantity, product:products(id, name, price))',
});`;
}
