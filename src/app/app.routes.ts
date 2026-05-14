import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '',                  loadComponent: () => import('./pages/intro.page').then(m => m.IntroPage),                       title: 'ngx-saqly-supabase · Docs' },
  { path: 'installation',      loadComponent: () => import('./pages/installation.page').then(m => m.InstallationPage),         title: 'Installation' },
  { path: 'quick-setup',       loadComponent: () => import('./pages/quick-setup.page').then(m => m.QuickSetupPage),            title: 'Quick Setup' },
  { path: 'schema',            loadComponent: () => import('./pages/schema.page').then(m => m.SchemaPage),                     title: 'Define Your Schema' },
  { path: 'migrations',        loadComponent: () => import('./pages/migrations.page').then(m => m.MigrationsPage),             title: 'Run Migrations' },
  { path: 'crud',              loadComponent: () => import('./pages/crud.page').then(m => m.CrudPage),                         title: 'CRUD Operations' },
  { path: 'joins',             loadComponent: () => import('./pages/joins.page').then(m => m.JoinsPage),                       title: 'Joins & Queries' },
  { path: 'relations',         loadComponent: () => import('./pages/relations.page').then(m => m.RelationsPage),               title: 'Relations' },
  { path: 'rls',               loadComponent: () => import('./pages/rls.page').then(m => m.RlsPage),                           title: 'RLS & Policies' },
  { path: 'auth',              loadComponent: () => import('./pages/auth.page').then(m => m.AuthPage),                         title: 'Authentication' },
  { path: 'example-products',  loadComponent: () => import('./pages/example-products.page').then(m => m.ExampleProductsPage),  title: 'Example · Products' },
  { path: 'example-real',      loadComponent: () => import('./pages/example-real.page').then(m => m.ExampleRealPage),          title: 'Example · Real' },
  { path: 'example-lms',       loadComponent: () => import('./pages/example-lms.page').then(m => m.ExampleLmsPage),            title: 'Example · LMS / Feedzony' },
  { path: 'api',               loadComponent: () => import('./pages/api.page').then(m => m.ApiPage),                           title: 'API Reference' },
  { path: 'ai-assistant',      loadComponent: () => import('./pages/ai-assistant.page').then(m => m.AiAssistantPage),          title: 'AI Assistant' },
  { path: '**', redirectTo: '' },
];
