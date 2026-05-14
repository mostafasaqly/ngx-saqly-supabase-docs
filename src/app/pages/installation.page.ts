import { Component } from '@angular/core';
import { DocPage } from '../shared/doc-page';
import { CodeBlock } from '../shared/code-block';

@Component({
  selector: 'installation-page',
  standalone: true,
  imports: [DocPage, CodeBlock],
  template: `
    <doc-page eyebrow="Step 0" title="Installation" lead="Install the package and its peer dependency in your Angular project.">

      <h2>Install via npm</h2>
      <code-block lang="bash" code="npm install ngx-saqly-supabase &#64;supabase/supabase-js" />

      <h2>Environment file</h2>
      <p>Add your Supabase project URL and anon key to your environment file. You can find these in your Supabase dashboard under <em>Settings → API</em>.</p>

      <code-block lang="ts" filename="src/environments/environment.ts" [code]="envCode" />

      <h2>Requirements</h2>
      <ul>
        <li><strong>Angular 17+</strong> — uses standalone components and signals</li>
        <li><strong>A Supabase project</strong> — free tier works fine</li>
      </ul>

      <div class="callout info">
        <strong>Tip</strong>
        <p>Never commit your service-role key to source control. The anon key is safe to expose — RLS protects your data.</p>
      </div>
    </doc-page>
  `,
})
export class InstallationPage {
  readonly envCode = `export const environment = {
  production: false,
  supabaseUrl: 'https://YOUR_PROJECT.supabase.co',
  supabaseAnonKey: 'eyJhbGciOi...',
};`;
}
