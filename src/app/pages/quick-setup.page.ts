import { Component } from '@angular/core';
import { DocPage } from '../shared/doc-page';
import { CodeBlock } from '../shared/code-block';

@Component({
  selector: 'quick-setup-page',
  standalone: true,
  imports: [DocPage, CodeBlock],
  template: `
    <doc-page eyebrow="Step 0" title="Quick Setup" lead="Wire up the Supabase provider once. Pass your URL, key, and any migrations.">

      <h2>Register the provider</h2>
      <p>Add <code>provideSaqlySupabase</code> to your <code>ApplicationConfig</code>. Migrations passed here will run automatically on startup — already-applied ones are silently skipped.</p>

      <code-block lang="ts" filename="src/app/app.config.ts" [code]="cfgCode" />

      <h2>Options</h2>
      <table>
        <thead><tr><th>Option</th><th>Required</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td><code>url</code></td><td>Yes</td><td>Your Supabase project URL.</td></tr>
          <tr><td><code>key</code></td><td>Yes</td><td>The anon (public) API key.</td></tr>
          <tr><td><code>migrations</code></td><td>No</td><td>Array of <code>MigrationDefinition</code> — runs on startup.</td></tr>
          <tr><td><code>serviceRoleKey</code></td><td>No</td><td>Service-role key — bypasses RLS for server-side admin tasks.</td></tr>
          <tr><td><code>managementKey</code></td><td>No</td><td>Supabase Management API key — lets migrations run without <code>exec_sql</code>.</td></tr>
        </tbody>
      </table>

      <div class="callout warn">
        <strong>About keys</strong>
        <p>Use the anon key in your client app. Only use service-role or management keys in trusted server-only contexts (Edge Functions, CI, etc.).</p>
      </div>
    </doc-page>
  `,
})
export class QuickSetupPage {
  readonly cfgCode = `import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
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
}
