import { Component } from '@angular/core';
import { DocPage } from '../shared/doc-page';
import { CodeBlock } from '../shared/code-block';

@Component({
  selector: 'auth-page',
  standalone: true,
  imports: [DocPage, CodeBlock],
  template: `
    <doc-page title="Authentication" lead="A signal-based auth API on top of Supabase Auth. Read the current user as a signal, sign up, sign in, sign out — all in three lines.">

      <h2>Inject auth</h2>
      <code-block lang="ts" [code]="injectCode" />

      <h2>Sign up / sign in / sign out</h2>
      <code-block lang="ts" [code]="actionsCode" />

      <h2>Use in templates</h2>
      <code-block lang="html" [code]="tmplCode" />

      <div class="callout">
        <strong>Reactive everywhere</strong>
        <p><code>auth.user()</code> and <code>auth.loading()</code> are signals — they update automatically when the session changes (login, logout, token refresh).</p>
      </div>
    </doc-page>
  `,
})
export class AuthPage {
  readonly injectCode = `import { injectAuth } from 'ngx-saqly-supabase';

export class AppComponent {
  readonly auth = injectAuth();
  // auth.user()    → Signal<User | null>
  // auth.loading() → Signal<boolean>
}`;

  readonly actionsCode = `const signUpResult = await this.auth.signUp('user@example.com', 'password');
if (signUpResult.confirmationRequired) { /* email sent */ }

const signInResult = await this.auth.signIn('user@example.com', 'password');
if (signInResult.error) console.error(signInResult.error);

await this.auth.signOut();`;

  readonly tmplCode = `&#64;if (auth.loading()) { <p>Loading...</p> }

&#64;if (auth.user()) {
  <p>Welcome, {{ '{{ auth.user()?.email }}' }}</p>
  <button (click)="auth.signOut()">Sign out</button>
}

&#64;if (!auth.loading() && !auth.user()) {
  <!-- show login form -->
}`;
}
