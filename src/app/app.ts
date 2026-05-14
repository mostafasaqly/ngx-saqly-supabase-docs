import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

interface NavItem { label: string; path: string; tag?: string; }
interface NavGroup { title: string; items: NavItem[]; }

const NAV: NavGroup[] = [
  {
    title: 'Getting Started',
    items: [
      { label: 'Introduction', path: '/' },
      { label: 'Installation', path: '/installation' },
      { label: 'Quick Setup', path: '/quick-setup' },
    ],
  },
  {
    title: 'Core Concepts',
    items: [
      { label: 'Define Your Schema', path: '/schema' },
      { label: 'Run Migrations', path: '/migrations' },
      { label: 'CRUD Operations', path: '/crud' },
      { label: 'Joins & Queries', path: '/joins' },
      { label: 'Relations', path: '/relations' },
      { label: 'RLS & Policies', path: '/rls' },
      { label: 'Authentication', path: '/auth' },
    ],
  },
  {
    title: 'Examples',
    items: [
      { label: 'Products (full CRUD)', path: '/example-products', tag: 'demo' },
      { label: 'Users · Products · Categories', path: '/example-real', tag: 'demo' },
      { label: 'LMS or Feedzony SaaS', path: '/example-lms', tag: 'demo' },
    ],
  },
  {
    title: 'Reference',
    items: [
      { label: 'API Reference', path: '/api' },
    ],
  },
  {
    title: 'Tools',
    items: [
      { label: 'AI Assistant', path: '/ai-assistant', tag: 'free' },
    ],
  },
];

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  search = signal('');

  filteredGroups = computed<NavGroup[]>(() => {
    const q = this.search().trim().toLowerCase();
    if (!q) return NAV;
    return NAV
      .map(g => ({ ...g, items: g.items.filter(i => i.label.toLowerCase().includes(q)) }))
      .filter(g => g.items.length > 0);
  });

  onSearch(v: string): void { this.search.set(v); }
}
