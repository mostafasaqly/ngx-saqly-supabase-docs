import { Component } from '@angular/core';
import { DocPage } from '../shared/doc-page';
import { CodeBlock } from '../shared/code-block';

@Component({
  selector: 'rls-page',
  standalone: true,
  imports: [DocPage, CodeBlock],
  template: `
    <doc-page title="Row-Level Security & Policies" lead="Build policies fluently. Policies are TypeScript objects — and the generated SQL includes matching grants automatically.">

      <h2>Define a policy</h2>
      <code-block lang="ts" [code]="policyCode" />

      <h2>Supported operations</h2>
      <div class="kbd-list">
        <span class="badge">select</span>
        <span class="badge">insert</span>
        <span class="badge">update</span>
        <span class="badge">delete</span>
        <span class="badge">all</span>
      </div>

      <h2>Builder API</h2>
      <table>
        <thead><tr><th>Step</th><th>Method</th><th>Notes</th></tr></thead>
        <tbody>
          <tr><td>1</td><td><code>policy.select(name)</code></td><td>One of <code>select</code> / <code>insert</code> / <code>update</code> / <code>delete</code> / <code>all</code>.</td></tr>
          <tr><td>2</td><td><code>.on(Table)</code></td><td>The schema this policy applies to.</td></tr>
          <tr><td>3</td><td><code>.to('anon' | 'authenticated' | role)</code></td><td>One or more roles.</td></tr>
          <tr><td>4</td><td><code>.using(sqlExpr)</code></td><td>Row visibility — for read / update / delete.</td></tr>
          <tr><td>5</td><td><code>.withCheck(sqlExpr)</code></td><td>Row constraint — for insert / update.</td></tr>
          <tr><td>6</td><td><code>.build()</code></td><td>Returns a <code>PolicyDefinition</code> ready to attach to a migration.</td></tr>
        </tbody>
      </table>

      <div class="callout warn">
        <strong>Don't forget RLS</strong>
        <p>Add the table to the migration's <code>rls</code> array — otherwise the policies are created but RLS is not enabled.</p>
      </div>
    </doc-page>
  `,
})
export class RlsPage {
  readonly policyCode = `import { policy } from 'ngx-saqly-supabase';

const ReadOwnPolicy = policy
  .select('Users read own tasks')
  .on(TasksTable)
  .to('authenticated')
  .using('auth.uid() = user_id')
  .build();

const InsertOwnPolicy = policy
  .insert('Users insert own tasks')
  .on(TasksTable)
  .to('authenticated')
  .withCheck('auth.uid() = user_id')
  .build();`;
}
