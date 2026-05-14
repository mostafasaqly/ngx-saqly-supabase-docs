import { Component } from '@angular/core';
import { DocPage } from '../shared/doc-page';
import { CodeBlock } from '../shared/code-block';

@Component({
  selector: 'api-page',
  standalone: true,
  imports: [DocPage, CodeBlock],
  template: `
    <doc-page title="API Reference" lead="A complete list of every export in ngx-saqly-supabase.">

      <h2>Provider</h2>
      <table>
        <thead><tr><th>Symbol</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td><code>provideSaqlySupabase(config)</code></td><td>Application-level provider. Pass your Supabase URL, key, and optional migrations.</td></tr>
        </tbody>
      </table>

      <h2>Schema builders</h2>
      <table>
        <thead><tr><th>Symbol</th><th>Returns</th><th>Notes</th></tr></thead>
        <tbody>
          <tr><td><code>defineSchema(name, fields)</code></td><td><code>SchemaDefinition</code></td><td>Declares a database table.</td></tr>
          <tr><td><code>defineModel(schema)</code></td><td><code>Model&lt;T&gt;</code></td><td>Pairs a schema with its inferred row type.</td></tr>
          <tr><td><code>InferModel&lt;Schema&gt;</code></td><td>type</td><td>Inferred row type for the schema.</td></tr>
          <tr><td><code>field</code></td><td>fluent builder</td><td>See the <a routerLink="/schema">Schema</a> page.</td></tr>
          <tr><td><code>relation.oneToOne / oneToMany / manyToOne</code></td><td><code>RelationDefinition</code></td><td>Foreign-key constraints.</td></tr>
          <tr><td><code>alter(table)</code></td><td>fluent builder</td><td><code>.addColumn / .dropColumn / .renameColumn</code></td></tr>
          <tr><td><code>policy.select / insert / update / delete / all</code></td><td><code>PolicyDefinition</code></td><td>RLS policies. See <a routerLink="/rls">RLS</a>.</td></tr>
        </tbody>
      </table>

      <h2>Injection functions</h2>
      <table>
        <thead><tr><th>Symbol</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td><code>injectModel(Model)</code></td><td>A typed repository for the model — <code>findMany</code>, <code>insert</code>, etc.</td></tr>
          <tr><td><code>injectAuth()</code></td><td>Signal-based auth client: <code>user()</code>, <code>loading()</code>, <code>signIn</code>, <code>signUp</code>, <code>signOut</code>.</td></tr>
          <tr><td><code>injectMigration()</code></td><td>Migration runner with <code>checkSetup</code>, <code>getPending</code>, <code>previewMany</code>, <code>runMany</code>.</td></tr>
          <tr><td><code>injectSupabase()</code></td><td>Raw <code>SupabaseClient</code> for advanced cases (storage, realtime, etc.).</td></tr>
        </tbody>
      </table>

      <h2>Repository methods (<code>injectModel</code>)</h2>
      <code-block lang="ts" [code]="repoSig" />

      <h2>Migration types</h2>
      <code-block lang="ts" [code]="migTypes" />

      <h2>Re-exports</h2>
      <p>For convenience, the following Supabase symbols are re-exported:</p>
      <ul>
        <li><code>SupabaseClient</code></li>
        <li><code>User</code></li>
        <li><code>Session</code></li>
      </ul>
    </doc-page>
  `,
})
export class ApiPage {
  readonly repoSig = `interface Repository<T> {
  findAll():                                  Promise<T[]>;
  findMany(opts?:  FindOptions<T>):           Promise<T[]>;
  findFirst(opts?: FindOptions<T>):           Promise<T | null>;
  findById(id:     IdOf<T>):                  Promise<T | null>;

  insert(row:      WritePayload<T>):          Promise<T>;
  insertMany(rows: WritePayload<T>[]):        Promise<T[]>;
  upsert(row:      WritePayload<T>):          Promise<T>;
  updateById(id:   IdOf<T>, patch: WritePayload<T>): Promise<T>;
  updateMany(where: Filter<T>, patch: WritePayload<T>): Promise<T[]>;

  deleteById(id:   IdOf<T>):                  Promise<void>;
  deleteMany(where: Filter<T>):               Promise<void>;

  count(opts?:  { where?: Filter<T> }):       Promise<number>;
  exists(opts?: { where?: Filter<T> }):       Promise<boolean>;
}`;

  readonly migTypes = `interface MigrationDefinition {
  name:        string;
  tables?:     SchemaDefinition[];
  alterations?: AlterDefinition[];
  relations?:  RelationDefinition[];
  rls?:        SchemaDefinition[];
  policies?:   PolicyDefinition[];
}

interface MigrationRunResult {
  name:   string;
  result: { success: boolean; error?: string };
}`;
}
