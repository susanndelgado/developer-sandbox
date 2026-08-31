-- ============================================================================
-- ANGULAR REFERENCE GUIDE — Developer Sandbox
-- macOS-first · Angular 22.1-era · Reference Guide presentation
-- Paste this file into Local Sandbox Editor > Batch SQL.
-- Validate first, then Run Batch.
-- Re-running replaces only this Angular guide record.
-- ============================================================================

DELETE FROM records
WHERE id = 'rec-angular-reference-guide'
   OR slug = 'angular-reference-guide';

INSERT INTO records (
  id, title, slug, subtitle, description, type, status, visibility,
  featured, sort_order, created, updated, presentation_mode, nav_label,
  nav_group, parent_id, content_root_id, notes, custom_classes
) VALUES (
  'rec-angular-reference-guide',
  'Angular Reference Guide',
  'angular-reference-guide',
  NULL,
  'Angular setup, syntax, CLI, components, routing, forms, HTTP, testing, and macOS reference.',
  'reference-guide',
  'active',
  'public',
  0,
  NULL,
  strftime('%Y-%m-%dT%H:%M:%fZ','now'),
  strftime('%Y-%m-%dT%H:%M:%fZ','now'),
  'reference-guide',
  'Angular',
  'Reference Guides',
  NULL,
  NULL,
  'macOS-first Angular 22 reference. Current APIs checked against angular.dev on 2026-08-31.',
  'angular-reference-guide'
);

-- Categories
INSERT INTO categories (id, name, slug, description, parent_id, sort_order, featured)
SELECT 'cat-angular', 'Angular', 'angular', NULL, NULL, NULL, 0
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE lower(name) = 'angular');

INSERT INTO categories (id, name, slug, description, parent_id, sort_order, featured)
SELECT 'cat-web-development', 'Web Development', 'web-development', NULL, NULL, NULL, 0
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE lower(name) = 'web development');

INSERT OR IGNORE INTO record_categories (record_id, category_id)
SELECT 'rec-angular-reference-guide', id FROM categories WHERE lower(name) = 'angular' LIMIT 1;

INSERT OR IGNORE INTO record_categories (record_id, category_id)
SELECT 'rec-angular-reference-guide', id FROM categories WHERE lower(name) = 'web development' LIMIT 1;

-- Tags
INSERT INTO tags (id, name, slug, description)
SELECT 'tag-angular', 'Angular', 'angular', NULL
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE lower(name) = 'angular');
INSERT INTO tags (id, name, slug, description)
SELECT 'tag-typescript', 'TypeScript', 'typescript', NULL
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE lower(name) = 'typescript');
INSERT INTO tags (id, name, slug, description)
SELECT 'tag-macos', 'macOS', 'macos', NULL
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE lower(name) = 'macos');
INSERT INTO tags (id, name, slug, description)
SELECT 'tag-cli', 'CLI', 'cli', NULL
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE lower(name) = 'cli');
INSERT INTO tags (id, name, slug, description)
SELECT 'tag-signals', 'Signals', 'signals', NULL
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE lower(name) = 'signals');

INSERT OR IGNORE INTO record_tags (record_id, tag_id)
SELECT 'rec-angular-reference-guide', id FROM tags
WHERE lower(name) IN ('angular','typescript','macos','cli','signals');

-- Technology
INSERT INTO technologies (id, name, type, slug, description, official_url, category_id)
SELECT
  'tech-angular',
  'Angular',
  'frontend-framework',
  'angular',
  'TypeScript web application framework with first-party routing, DI, forms, HTTP, testing, and CLI tooling.',
  'https://angular.dev/',
  NULL
WHERE NOT EXISTS (SELECT 1 FROM technologies WHERE lower(name) = 'angular');

INSERT OR IGNORE INTO record_technologies (record_id, technology_id, role, sort_order)
SELECT 'rec-angular-reference-guide', id, 'Primary framework', 10
FROM technologies WHERE lower(name) = 'angular' LIMIT 1;

-- ============================================================================
-- PARENT NODES
-- ============================================================================

INSERT INTO content_nodes (id, record_id, type, parent_id, title, subtitle, description, nav_label, content, sort_order, featured, hidden, class_name, metadata)
VALUES
('angular-nav','rec-angular-reference-guide','nav',NULL,'',NULL,NULL,NULL,'<strong>Quick jump:</strong>',10,0,0,'','{"mode":"navigation","category":"Navigation"}'),
('angular-glance','rec-angular-reference-guide','grid',NULL,'Angular at a Glance',NULL,'<p><strong>Angular</strong> is a TypeScript web application framework with components, templates, dependency injection, routing, forms, HTTP, reactivity, testing, build tooling, and a first-party CLI.</p><p>This guide targets modern Angular 22.1-era standalone applications.</p>',NULL,NULL,20,0,0,'','{"mode":"default","category":"Angular"}'),
('angular-install','rec-angular-reference-guide','split',NULL,'macOS Setup & Installation',NULL,'<p>Use a Node version manager on a development Mac so projects can target supported Node versions cleanly.</p>',NULL,'<p>Columns read as <strong>Purpose / Commands / Notes</strong>.</p>',30,0,0,'','{"mode":"three-column-default","category":"Angular"}'),
('angular-project','rec-angular-reference-guide','split',NULL,'Create & Run a Project',NULL,'<p><code>ng new</code> creates an Angular workspace and starter application. Run it outside another Angular workspace.</p>',NULL,NULL,40,0,0,'','{"mode":"half-default","category":"Angular"}'),
('angular-cli','rec-angular-reference-guide','code',NULL,'Angular CLI Commands',NULL,'<p>The CLI executable is <code>ng</code>. Common aliases include <code>g</code>, <code>s</code>, <code>b</code>, and <code>t</code>.</p>',NULL,NULL,50,0,0,'','{"mode":"collapse-list","category":"Angular"}'),
('angular-workspace','rec-angular-reference-guide','grid',NULL,'Workspace & File Map',NULL,'<p>Exact files vary by CLI options and release, but these are the common files in a current standalone application.</p>',NULL,NULL,60,0,0,'','{"mode":"default","category":"Angular"}'),
('angular-components','rec-angular-reference-guide','code',NULL,'Components',NULL,'<p>A component combines a TypeScript class, Angular metadata, a selector, a template, and optional styles/imports.</p>',NULL,NULL,70,0,0,'','{"mode":"collapse-list","category":"Angular"}'),
('angular-templates','rec-angular-reference-guide','code',NULL,'Template Syntax',NULL,'<p>Angular templates are HTML plus expression, binding, control-flow, variable, and pipe syntax.</p>',NULL,NULL,80,0,0,'','{"mode":"collapse-list","category":"Angular"}'),
('angular-signals','rec-angular-reference-guide','code',NULL,'Signals & Reactive State',NULL,'<p>Signals are Angular reactive primitives. Read a signal by calling it as a function.</p>',NULL,NULL,90,0,0,'','{"mode":"collapse-list","category":"Angular"}'),
('angular-io','rec-angular-reference-guide','code',NULL,'Inputs & Outputs',NULL,'<p>Inputs pass data into components. Outputs emit custom events to component consumers. Function-based APIs are preferred for new code.</p>',NULL,NULL,100,0,0,'','{"mode":"collapse-list","category":"Angular"}'),
('angular-di','rec-angular-reference-guide','code',NULL,'Services & Dependency Injection',NULL,'<p>Dependency injection lets classes request collaborators rather than constructing them directly.</p>',NULL,NULL,110,0,0,'','{"mode":"collapse-list","category":"Angular"}'),
('angular-routing','rec-angular-reference-guide','code',NULL,'Router Quick Reference',NULL,'<p>Routes map URLs to components. Angular uses first-match wins, so specific routes belong before generic routes and wildcards.</p>',NULL,NULL,120,0,0,'','{"mode":"collapse-list","category":"Angular"}'),
('angular-forms','rec-angular-reference-guide','code',NULL,'Forms',NULL,'<p>Reactive forms remain a strong stable default. Template-driven and newer Signal Forms are also available.</p>',NULL,NULL,130,0,0,'','{"mode":"collapse-list","category":"Angular"}'),
('angular-http','rec-angular-reference-guide','code',NULL,'HTTP & API Calls',NULL,'<p><code>HttpClient</code> is injectable by default in Angular 21+. Current Angular uses Fetch by default unless configured for XHR.</p>',NULL,NULL,140,0,0,'','{"mode":"collapse-list","category":"Angular"}'),
('angular-rxjs','rec-angular-reference-guide','code',NULL,'RxJS Essentials',NULL,'<p>Signals are excellent for synchronous application state; RxJS remains useful for asynchronous streams and HTTP pipelines.</p>',NULL,NULL,150,0,0,'','{"mode":"collapse-list","category":"Angular"}'),
('angular-lifecycle','rec-angular-reference-guide','code',NULL,'Lifecycle & Cleanup',NULL,'<p>Use lifecycle hooks only when the timing matters. Prefer framework-managed cleanup and <code>DestroyRef</code> for explicit teardown.</p>',NULL,NULL,160,0,0,'','{"mode":"collapse-list","category":"Angular"}'),
('angular-testing','rec-angular-reference-guide','code',NULL,'Testing',NULL,'<p>New Angular CLI projects use Vitest by default. TestBed remains the Angular-aware testing utility.</p>',NULL,NULL,170,0,0,'','{"mode":"collapse-list","category":"Angular"}'),
('angular-build','rec-angular-reference-guide','code',NULL,'Build, Update & Deploy',NULL,'<p>The development server is not your deployment artifact. Build optimized output and deploy the generated files through your hosting platform.</p>',NULL,NULL,180,0,0,'','{"mode":"collapse-list","category":"Angular"}'),
('angular-practices','rec-angular-reference-guide','standard',NULL,'Modern Implementation Practices',NULL,'<p>Current Angular defaults for new work, while retaining enough older API knowledge to maintain existing applications.</p>',NULL,NULL,190,0,0,'','{"mode":"collapse-list","category":"Angular"}'),
('angular-troubleshoot','rec-angular-reference-guide','grid',NULL,'Troubleshooting Fast Map',NULL,'<p>Check runtime versions, imports, routing order, and workspace context before reinstalling everything.</p>',NULL,NULL,200,0,0,'','{"mode":"default","category":"Angular"}'),
('angular-docs','rec-angular-reference-guide','standard',NULL,'Official Documentation & Downloads',NULL,'<p>Angular changes regularly. Use the current official documentation whenever setup or API behavior is version-sensitive.</p>',NULL,NULL,210,0,0,'','{"mode":"link-list","category":"Angular"}');

-- ============================================================================
-- NAV CHILDREN
-- ============================================================================
INSERT INTO content_nodes (id, record_id, type, parent_id, title, nav_label, sort_order, metadata)
VALUES
('angular-nav-1','rec-angular-reference-guide','standard','angular-nav','At a Glance','At a Glance',10,'{"url":"#node-angular-glance"}'),
('angular-nav-2','rec-angular-reference-guide','standard','angular-nav','macOS Setup','macOS Setup',20,'{"url":"#node-angular-install"}'),
('angular-nav-3','rec-angular-reference-guide','standard','angular-nav','Create Project','Create Project',30,'{"url":"#node-angular-project"}'),
('angular-nav-4','rec-angular-reference-guide','standard','angular-nav','CLI','CLI',40,'{"url":"#node-angular-cli"}'),
('angular-nav-5','rec-angular-reference-guide','standard','angular-nav','Files','Files',50,'{"url":"#node-angular-workspace"}'),
('angular-nav-6','rec-angular-reference-guide','standard','angular-nav','Components','Components',60,'{"url":"#node-angular-components"}'),
('angular-nav-7','rec-angular-reference-guide','standard','angular-nav','Templates','Templates',70,'{"url":"#node-angular-templates"}'),
('angular-nav-8','rec-angular-reference-guide','standard','angular-nav','Signals','Signals',80,'{"url":"#node-angular-signals"}'),
('angular-nav-9','rec-angular-reference-guide','standard','angular-nav','Inputs / Outputs','Inputs / Outputs',90,'{"url":"#node-angular-io"}'),
('angular-nav-10','rec-angular-reference-guide','standard','angular-nav','DI','DI',100,'{"url":"#node-angular-di"}'),
('angular-nav-11','rec-angular-reference-guide','standard','angular-nav','Routing','Routing',110,'{"url":"#node-angular-routing"}'),
('angular-nav-12','rec-angular-reference-guide','standard','angular-nav','Forms','Forms',120,'{"url":"#node-angular-forms"}'),
('angular-nav-13','rec-angular-reference-guide','standard','angular-nav','HTTP','HTTP',130,'{"url":"#node-angular-http"}'),
('angular-nav-14','rec-angular-reference-guide','standard','angular-nav','Testing','Testing',140,'{"url":"#node-angular-testing"}'),
('angular-nav-15','rec-angular-reference-guide','standard','angular-nav','Build','Build',150,'{"url":"#node-angular-build"}'),
('angular-nav-16','rec-angular-reference-guide','standard','angular-nav','Docs','Docs',160,'{"url":"#node-angular-docs"}');

-- ============================================================================
-- AT A GLANCE GRID
-- ============================================================================
INSERT INTO content_nodes (id, record_id, type, parent_id, title, content, sort_order, metadata)
VALUES
('angular-glance-version','rec-angular-reference-guide','standard','angular-glance','Current Major','<p>Angular 22 is the active major. Current angular.dev pages are built with Angular <strong>22.1.4</strong>.</p>',10,'{}'),
('angular-glance-node','rec-angular-reference-guide','standard','angular-glance','Node Compatibility','<p>Angular 22 supports Node <code>^22.22.3</code>, <code>^24.15.0</code>, or <code>^26.0.0</code>. Node 24 LTS is a strong macOS baseline.</p>',20,'{}'),
('angular-glance-ts','rec-angular-reference-guide','standard','angular-glance','TypeScript','<p>Angular 22 requires TypeScript <code>&gt;=6.0.0 &lt;6.1.0</code>.</p>',30,'{}'),
('angular-glance-standalone','rec-angular-reference-guide','standard','angular-glance','Standalone-first','<p>New components are standalone by default. Import template dependencies directly in the component.</p>',40,'{}'),
('angular-glance-signals','rec-angular-reference-guide','standard','angular-glance','Signals','<p><code>signal()</code> stores reactive state; <code>computed()</code> derives reactive values.</p>',50,'{}'),
('angular-glance-control','rec-angular-reference-guide','standard','angular-glance','Control Flow','<p>Use <code>@if</code>, <code>@for</code>, and <code>@switch</code> in modern templates.</p>',60,'{}'),
('angular-glance-zone','rec-angular-reference-guide','standard','angular-glance','Zoneless','<p>Zoneless change detection is the default in Angular 21+.</p>',70,'{}'),
('angular-glance-test','rec-angular-reference-guide','standard','angular-glance','Testing','<p>New CLI projects use Vitest. Run tests with <code>ng test</code>.</p>',80,'{}');

-- ============================================================================
-- macOS INSTALLATION — THREE COLUMN SPLIT
-- ============================================================================
INSERT INTO content_nodes (id, record_id, type, parent_id, title, description, content, sort_order, metadata)
VALUES
('angular-install-node','rec-angular-reference-guide','standard','angular-install','Node + npm','<p><strong>Purpose:</strong> Angular CLI runs on Node and npm.</p>','<pre><code>nvm install 24\nnvm use 24\nnode -v\nnpm -v</code></pre>',10,'{"additionalHtml":"<p><strong>Notes:</strong> Angular 22 requires Node 22.22.3+, 24.15+, or 26.x. Node 24 LTS is a practical development target.</p>"}'),
('angular-install-cli','rec-angular-reference-guide','standard','angular-install','Angular CLI','<p><strong>Purpose:</strong> installs the <code>ng</code> command.</p>','<pre><code>npm install -g @angular/cli\nng version\nwhich ng</code></pre>',20,'{"additionalHtml":"<p><strong>Notes:</strong> with nvm, routine <code>sudo npm install -g</code> should not be necessary.</p>"}'),
('angular-install-tools','rec-angular-reference-guide','standard','angular-install','Editor Tooling','<p><strong>Purpose:</strong> template completion, diagnostics, navigation, and refactoring.</p>','<ul><li>VS Code or WebStorm</li><li>Angular Language Service</li><li>Browser DevTools</li></ul>',30,'{"additionalHtml":"<p>Use <code>ng completion</code> for CLI shell completion. Angular Language Service docs are linked below.</p>"}');

-- ============================================================================
-- CREATE PROJECT — HALF SPLIT
-- ============================================================================
INSERT INTO content_nodes (id, record_id, type, parent_id, title, description, content, sort_order, metadata)
VALUES
('angular-project-new','rec-angular-reference-guide','standard','angular-project','Create Workspace','<p>Create a workspace and initial application.</p>','<pre><code>ng new my-app\ncd my-app</code></pre>',10,'{}'),
('angular-project-routing','rec-angular-reference-guide','standard','angular-project','Routing + SCSS','<p>Set common project options explicitly.</p>','<pre><code>ng new my-app --routing --style=scss</code></pre>',20,'{}'),
('angular-project-serve','rec-angular-reference-guide','standard','angular-project','Development Server','<p>Build, watch, serve, and reload during development.</p>','<pre><code>ng serve\nng serve --open\nng serve -o</code></pre>',30,'{}'),
('angular-project-url','rec-angular-reference-guide','standard','angular-project','Default URL','<p>The CLI development server normally listens here.</p>','<pre><code>http://localhost:4200/</code></pre>',40,'{}'),
('angular-project-port','rec-angular-reference-guide','standard','angular-project','Different Port','<p>Useful when port 4200 is already occupied.</p>','<pre><code>ng serve --port 4300</code></pre>',50,'{}');

-- ============================================================================
-- CLI COMMANDS — COLLAPSIBLE CODE
-- ============================================================================
INSERT INTO content_nodes (id, record_id, type, parent_id, title, description, sort_order, metadata)
VALUES
('angular-cli-version','rec-angular-reference-guide','standard','angular-cli','ng version','<p>Show framework, CLI, Node, npm, and platform versions.</p>',10,'{"code":"ng version"}'),
('angular-cli-help','rec-angular-reference-guide','standard','angular-cli','Help','<p>List commands or inspect command-specific options.</p>',20,'{"code":"ng help\nng generate component --help"}'),
('angular-cli-new','rec-angular-reference-guide','standard','angular-cli','New Workspace','<p>Create a new workspace and starter app.</p>',30,'{"code":"ng new my-app"}'),
('angular-cli-serve','rec-angular-reference-guide','standard','angular-cli','Serve','<p>Development server with file watching.</p>',40,'{"code":"ng serve\nng serve -o\nng serve --port 4300"}'),
('angular-cli-build','rec-angular-reference-guide','standard','angular-cli','Build','<p>Create distributable application output.</p>',50,'{"code":"ng build\nng build --configuration production"}'),
('angular-cli-component','rec-angular-reference-guide','standard','angular-cli','Generate Component','<p>Scaffold a component.</p>',60,'{"code":"ng generate component features/dashboard\nng g c features/dashboard"}'),
('angular-cli-service','rec-angular-reference-guide','standard','angular-cli','Generate Service','<p>Scaffold a service.</p>',70,'{"code":"ng generate service core/api\nng g s core/api"}'),
('angular-cli-directive','rec-angular-reference-guide','standard','angular-cli','Generate Directive','<p>Scaffold reusable host behavior.</p>',80,'{"code":"ng g directive shared/autofocus"}'),
('angular-cli-pipe','rec-angular-reference-guide','standard','angular-cli','Generate Pipe','<p>Scaffold a template transformation.</p>',90,'{"code":"ng g pipe shared/initials"}'),
('angular-cli-guard','rec-angular-reference-guide','standard','angular-cli','Generate Guard','<p>Scaffold a routing guard.</p>',100,'{"code":"ng g guard auth/auth"}'),
('angular-cli-interceptor','rec-angular-reference-guide','standard','angular-cli','Generate Interceptor','<p>Scaffold an HTTP interceptor.</p>',110,'{"code":"ng g interceptor core/auth"}'),
('angular-cli-test','rec-angular-reference-guide','standard','angular-cli','Test','<p>Run unit tests.</p>',120,'{"code":"ng test"}'),
('angular-cli-add','rec-angular-reference-guide','standard','angular-cli','ng add','<p>Install and configure a package that supplies Angular schematics.</p>',130,'{"code":"ng add @angular/material"}'),
('angular-cli-update','rec-angular-reference-guide','standard','angular-cli','Update','<p>Show available updates or run framework migrations.</p>',140,'{"code":"ng update\nng update @angular/core @angular/cli"}'),
('angular-cli-config','rec-angular-reference-guide','standard','angular-cli','Config','<p>Read or set workspace configuration.</p>',150,'{"code":"ng config\nng config cli.analytics false"}'),
('angular-cli-completion','rec-angular-reference-guide','standard','angular-cli','Completion','<p>Set up CLI shell completion.</p>',160,'{"code":"ng completion"}');

-- ============================================================================
-- WORKSPACE GRID
-- ============================================================================
INSERT INTO content_nodes (id, record_id, type, parent_id, title, content, sort_order, metadata)
VALUES
('angular-file-angularjson','rec-angular-reference-guide','standard','angular-workspace','angular.json','<p>Workspace build, serve, test, assets, styles, budgets, and target configuration.</p>',10,'{}'),
('angular-file-package','rec-angular-reference-guide','standard','angular-workspace','package.json','<p>npm dependencies and scripts. Angular packages use the <code>@angular/*</code> namespace.</p>',20,'{}'),
('angular-file-tsconfig','rec-angular-reference-guide','standard','angular-workspace','tsconfig.json','<p>TypeScript compiler configuration with Angular project configs extending it.</p>',30,'{}'),
('angular-file-main','rec-angular-reference-guide','standard','angular-workspace','src/main.ts','<p>Browser entry point. Standalone apps bootstrap with <code>bootstrapApplication()</code>.</p>',40,'{}'),
('angular-file-config','rec-angular-reference-guide','standard','angular-workspace','app.config.ts','<p>Application-level providers such as router and configured HTTP features.</p>',50,'{}'),
('angular-file-routes','rec-angular-reference-guide','standard','angular-workspace','app.routes.ts','<p>Route definitions when routing is enabled.</p>',60,'{}'),
('angular-file-app','rec-angular-reference-guide','standard','angular-workspace','app.ts','<p>Current CLI root component naming. Older workspaces often use <code>app.component.ts</code>.</p>',70,'{}'),
('angular-file-dist','rec-angular-reference-guide','standard','angular-workspace','dist/','<p>Generated production build output. Do not hand-edit generated files.</p>',80,'{}');

-- ============================================================================
-- COMPONENTS — COLLAPSIBLE CODE
-- ============================================================================
INSERT INTO content_nodes (id, record_id, type, parent_id, title, description, sort_order, metadata)
VALUES
('angular-component-min','rec-angular-reference-guide','standard','angular-components','Minimal Component','<p>Every component has TypeScript behavior, a template, and a selector.</p>',10,'{"code":"import { Component } from \'@angular/core\';\n\n@Component({\n  selector: \'app-greeting\',\n  template: `<h2>Hello Angular</h2>`,\n})\nexport class Greeting {}"}'),
('angular-component-files','rec-angular-reference-guide','standard','angular-components','External Template / Style','<p>Split larger markup and styles into matching files.</p>',20,'{"code":"@Component({\n  selector: \'app-profile\',\n  templateUrl: \'./profile.html\',\n  styleUrl: \'./profile.css\',\n})\nexport class Profile {}"}'),
('angular-component-imports','rec-angular-reference-guide','standard','angular-components','Standalone Imports','<p>Import components, directives, and pipes used by the template.</p>',30,'{"code":"import { RouterLink } from \'@angular/router\';\n\n@Component({\n  selector: \'app-nav\',\n  imports: [RouterLink],\n  template: `<a routerLink=\"/about\">About</a>`,\n})\nexport class Nav {}"}'),
('angular-component-child','rec-angular-reference-guide','standard','angular-components','Use a Child Component','<p>Import the child class and use its selector.</p>',40,'{"code":"@Component({\n  selector: \'app-page\',\n  imports: [UserCard],\n  template: `<app-user-card />`,\n})\nexport class Page {}"}'),
('angular-component-directive','rec-angular-reference-guide','standard','angular-components','Attribute Directive','<p>Use a directive to package reusable behavior on an existing host element.</p>',50,'{"code":"@Directive({\n  selector: \'[appHighlight]\',\n  host: {\n    \'(mouseenter)\': \'active.set(true)\',\n    \'(mouseleave)\': \'active.set(false)\',\n    \'[class.highlight]\': \'active()\',\n  },\n})\nexport class Highlight {\n  active = signal(false);\n}"}');

-- ============================================================================
-- TEMPLATE SYNTAX — COLLAPSIBLE CODE
-- ============================================================================
INSERT INTO content_nodes (id, record_id, type, parent_id, title, description, sort_order, metadata)
VALUES
('angular-template-interp','rec-angular-reference-guide','standard','angular-templates','Interpolation','<p>Render an expression as text.</p>',10,'{"code":"{{ user.name }}"}'),
('angular-template-property','rec-angular-reference-guide','standard','angular-templates','Property Binding','<p>Bind a DOM or component property.</p>',20,'{"code":"<img [src]=\"photoUrl\" [alt]=\"name\">"}'),
('angular-template-event','rec-angular-reference-guide','standard','angular-templates','Event Binding','<p>Listen for a DOM event or component output.</p>',30,'{"code":"<button (click)=\"save()\">Save</button>\n<button (click)=\"select($event)\">Select</button>"}'),
('angular-template-class','rec-angular-reference-guide','standard','angular-templates','Class / Style Binding','<p>Bind classes and styles directly.</p>',40,'{"code":"<div [class.active]=\"isActive\" [style.width.px]=\"width\"></div>"}'),
('angular-template-if','rec-angular-reference-guide','standard','angular-templates','@if','<p>Built-in conditional rendering.</p>',50,'{"code":"@if (user()) {\n  <p>Hello {{ user()!.name }}</p>\n} @else {\n  <p>Please sign in.</p>\n}"}'),
('angular-template-for','rec-angular-reference-guide','standard','angular-templates','@for','<p>Repeat values and provide a stable tracking expression.</p>',60,'{"code":"@for (item of items(); track item.id) {\n  <li>{{ item.name }}</li>\n} @empty {\n  <li>No items</li>\n}"}'),
('angular-template-switch','rec-angular-reference-guide','standard','angular-templates','@switch','<p>Choose among cases; there is no fallthrough behavior.</p>',70,'{"code":"@switch (role()) {\n  @case (\'admin\') { <app-admin /> }\n  @case (\'editor\') { <app-editor /> }\n  @default { <app-viewer /> }\n}"}'),
('angular-template-pipe','rec-angular-reference-guide','standard','angular-templates','Pipes','<p>Transform values declaratively for display. Import standalone pipes used by the template.</p>',80,'{"code":"{{ total | currency }}\n{{ createdAt | date:\'medium\' }}"}');

-- ============================================================================
-- SIGNALS
-- ============================================================================
INSERT INTO content_nodes (id, record_id, type, parent_id, title, description, sort_order, metadata)
VALUES
('angular-signal-create','rec-angular-reference-guide','standard','angular-signals','signal()','<p>Create writable reactive state and read it by calling the signal.</p>',10,'{"code":"count = signal(0);\nconsole.log(this.count());"}'),
('angular-signal-set','rec-angular-reference-guide','standard','angular-signals','set()','<p>Replace a writable signal value.</p>',20,'{"code":"this.count.set(5);"}'),
('angular-signal-update','rec-angular-reference-guide','standard','angular-signals','update()','<p>Calculate the next value from the previous value.</p>',30,'{"code":"this.count.update(value => value + 1);"}'),
('angular-signal-computed','rec-angular-reference-guide','standard','angular-signals','computed()','<p>Create read-only, memoized derived state.</p>',40,'{"code":"first = signal(\'Susan\');\nlast = signal(\'Nicole\');\nfullName = computed(() => `${this.first()} ${this.last()}`);"}'),
('angular-signal-effect','rec-angular-reference-guide','standard','angular-signals','effect()','<p>Use effects for appropriate imperative/non-reactive side effects such as logging, storage, canvas, or third-party APIs. Prefer <code>computed()</code> for derived state.</p>',50,'{"code":"logCount = effect(() => {\n  console.log(this.count());\n});"}');

-- ============================================================================
-- INPUT / OUTPUT
-- ============================================================================
INSERT INTO content_nodes (id, record_id, type, parent_id, title, description, sort_order, metadata)
VALUES
('angular-io-input','rec-angular-reference-guide','standard','angular-io','input()','<p>Declare an optional signal-based input.</p>',10,'{"code":"name = input(\'Guest\');\n// template reads: {{ name() }}"}'),
('angular-io-required','rec-angular-reference-guide','standard','angular-io','input.required()','<p>Require the consumer to supply a value.</p>',20,'{"code":"user = input.required<User>();\n\n<app-user-card [user]=\"selectedUser()\" />"}'),
('angular-io-output','rec-angular-reference-guide','standard','angular-io','output()','<p>Declare and emit a typed custom event.</p>',30,'{"code":"saved = output<User>();\n\nsave(user: User) {\n  this.saved.emit(user);\n}"}'),
('angular-io-listen','rec-angular-reference-guide','standard','angular-io','Listen to Output','<p>The parent receives emitted data as <code>$event</code>.</p>',40,'{"code":"<app-user-form (saved)=\"handleSaved($event)\" />"}'),
('angular-io-old','rec-angular-reference-guide','standard','angular-io','Older Compatibility APIs','<p><code>@Input()</code>, <code>@Output()</code>, and <code>EventEmitter</code> remain supported and appear in existing projects.</p>',50,'{"code":"@Input() user!: User;\n@Output() saved = new EventEmitter<User>();"}');

-- ============================================================================
-- SERVICES & DI
-- ============================================================================
INSERT INTO content_nodes (id, record_id, type, parent_id, title, description, sort_order, metadata)
VALUES
('angular-di-service','rec-angular-reference-guide','standard','angular-di','Root Service','<p><code>providedIn: root</code> is the standard global singleton pattern.</p>',10,'{"code":"@Injectable({ providedIn: \'root\' })\nexport class UserService {}"}'),
('angular-di-inject','rec-angular-reference-guide','standard','angular-di','inject()','<p>Current Angular style guidance prefers <code>inject()</code> over constructor parameter injection.</p>',20,'{"code":"private users = inject(UserService);\nprivate router = inject(Router);"}'),
('angular-di-component','rec-angular-reference-guide','standard','angular-di','Component Provider','<p>Create an instance scoped to a component subtree.</p>',30,'{"code":"@Component({\n  providers: [DraftService],\n  template: `...`,\n})\nexport class Editor {}"}'),
('angular-di-token','rec-angular-reference-guide','standard','angular-di','InjectionToken','<p>Provide typed configuration or another non-class dependency.</p>',40,'{"code":"export const API_URL = new InjectionToken<string>(\'API_URL\');\n\nproviders: [{ provide: API_URL, useValue: \'/api\' }]"}');

-- ============================================================================
-- ROUTING
-- ============================================================================
INSERT INTO content_nodes (id, record_id, type, parent_id, title, description, sort_order, metadata)
VALUES
('angular-route-array','rec-angular-reference-guide','standard','angular-routing','Define Routes','<p>CLI routing projects normally use <code>src/app/app.routes.ts</code>.</p>',10,'{"code":"export const routes: Routes = [\n  { path: \'\', component: Home, title: \'Home\' },\n  { path: \'users/:id\', component: UserDetail },\n  { path: \'**\', component: NotFound },\n];"}'),
('angular-route-provider','rec-angular-reference-guide','standard','angular-routing','provideRouter()','<p>Add the router through application providers.</p>',20,'{"code":"export const appConfig = {\n  providers: [provideRouter(routes)],\n};"}'),
('angular-route-outlet','rec-angular-reference-guide','standard','angular-routing','RouterOutlet','<p>The active route component renders at the outlet.</p>',30,'{"code":"@Component({\n  imports: [RouterOutlet],\n  template: `<router-outlet />`,\n})\nexport class App {}"}'),
('angular-route-link','rec-angular-reference-guide','standard','angular-routing','RouterLink','<p>Use Angular navigation for internal links rather than full page reloads.</p>',40,'{"code":"@Component({\n  imports: [RouterLink],\n  template: `<a routerLink=\"/users\">Users</a>`,\n})\nexport class Nav {}"}'),
('angular-route-lazy','rec-angular-reference-guide','standard','angular-routing','Lazy Route','<p>Use dynamic import to split non-primary route code.</p>',50,'{"code":"{\n  path: \'settings\',\n  loadComponent: () => import(\'./settings/settings\').then(m => m.Settings)\n}"}'),
('angular-route-nav','rec-angular-reference-guide','standard','angular-routing','Programmatic Navigation','<p>Inject Router for navigation triggered by application logic.</p>',60,'{"code":"private router = inject(Router);\n\nopenUser(id: string) {\n  this.router.navigate([\'/users\', id]);\n}"}'),
('angular-route-guard','rec-angular-reference-guide','standard','angular-routing','Guard','<p>Guards control client navigation but must never be the only authorization layer.</p>',70,'{"code":"export const authGuard: CanActivateFn = () => {\n  const auth = inject(AuthService);\n  return auth.isLoggedIn() ? true : inject(Router).createUrlTree([\'/login\']);\n};"}');

-- ============================================================================
-- FORMS
-- ============================================================================
INSERT INTO content_nodes (id, record_id, type, parent_id, title, description, sort_order, metadata)
VALUES
('angular-form-control','rec-angular-reference-guide','standard','angular-forms','Reactive FormControl','<p>Model-driven, explicit, stable form state.</p>',10,'{"code":"imports: [ReactiveFormsModule]\n\nname = new FormControl(\'\', { nonNullable: true });\n\n// template\n<input [formControl]=\"name\">"}'),
('angular-form-group','rec-angular-reference-guide','standard','angular-forms','FormGroup','<p>Group related controls into a form model.</p>',20,'{"code":"profile = new FormGroup({\n  name: new FormControl(\'\', { nonNullable: true }),\n  email: new FormControl(\'\', { nonNullable: true }),\n});"}'),
('angular-form-validator','rec-angular-reference-guide','standard','angular-forms','Validators','<p>Attach synchronous validation rules to controls.</p>',30,'{"code":"email = new FormControl(\'\', {\n  nonNullable: true,\n  validators: [Validators.required, Validators.email],\n});"}'),
('angular-form-ngmodel','rec-angular-reference-guide','standard','angular-forms','Template-driven / ngModel','<p>Useful for smaller forms. Import <code>FormsModule</code>.</p>',40,'{"code":"<input [(ngModel)]=\"name\" name=\"name\">"}'),
('angular-form-signal','rec-angular-reference-guide','standard','angular-forms','Signal Forms','<p>Angular 21+ signal-based field trees and validation. Consider current stability requirements before replacing established reactive forms.</p>',50,'{"code":"import { form, FormField } from \'@angular/forms/signals\';\n\nmodel = signal({ email: \'\' });\nloginForm = form(this.model);"}');

-- ============================================================================
-- HTTP
-- ============================================================================
INSERT INTO content_nodes (id, record_id, type, parent_id, title, description, sort_order, metadata)
VALUES
('angular-http-inject','rec-angular-reference-guide','standard','angular-http','Inject HttpClient','<p>Prefer focused API/data services rather than scattering requests through unrelated components.</p>',10,'{"code":"private http = inject(HttpClient);"}'),
('angular-http-get','rec-angular-reference-guide','standard','angular-http','GET','<p>HttpClient methods return RxJS Observables.</p>',20,'{"code":"getUsers() {\n  return this.http.get<User[]>(\'/api/users\');\n}"}'),
('angular-http-params','rec-angular-reference-guide','standard','angular-http','Query Parameters','<p>Use the request options object.</p>',30,'{"code":"return this.http.get<User[]>(\'/api/users\', {\n  params: { q: term }\n});"}'),
('angular-http-post','rec-angular-reference-guide','standard','angular-http','POST','<p>Send a typed request body.</p>',40,'{"code":"return this.http.post<User>(\'/api/users\', user);"}'),
('angular-http-methods','rec-angular-reference-guide','standard','angular-http','PUT / PATCH / DELETE','<p>Match the server API contract.</p>',50,'{"code":"this.http.put<User>(\'/api/users/42\', user);\nthis.http.patch<User>(\'/api/users/42\', changes);\nthis.http.delete<void>(\'/api/users/42\');"}'),
('angular-http-config','rec-angular-reference-guide','standard','angular-http','Configure HttpClient','<p>Use <code>provideHttpClient()</code> for interceptors or other HTTP features.</p>',60,'{"code":"providers: [\n  provideHttpClient(withInterceptors([authInterceptor]))\n]"}'),
('angular-http-interceptor','rec-angular-reference-guide','standard','angular-http','Functional Interceptor','<p>Clone immutable requests when adding headers.</p>',70,'{"code":"export const authInterceptor: HttpInterceptorFn = (req, next) => {\n  const token = inject(AuthService).token();\n  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));\n};"}');

-- ============================================================================
-- RXJS
-- ============================================================================
INSERT INTO content_nodes (id, record_id, type, parent_id, title, description, sort_order, metadata)
VALUES
('angular-rx-observable','rec-angular-reference-guide','standard','angular-rxjs','Observable','<p>A lazy stream that may emit values over time.</p>',10,'{"code":"users$ = this.http.get<User[]>(\'/api/users\');"}'),
('angular-rx-async','rec-angular-reference-guide','standard','angular-rxjs','AsyncPipe','<p>Template subscription with Angular-managed teardown.</p>',20,'{"code":"@for (user of users$ | async; track user.id) {\n  <p>{{ user.name }}</p>\n}"}'),
('angular-rx-map','rec-angular-reference-guide','standard','angular-rxjs','map()','<p>Transform emitted values.</p>',30,'{"code":"activeUsers$ = this.users$.pipe(\n  map(users => users.filter(user => user.active))\n);"}'),
('angular-rx-switch','rec-angular-reference-guide','standard','angular-rxjs','switchMap()','<p>Switch to a new inner stream and cancel the previous one. Useful for search and route-driven requests.</p>',40,'{"code":"results$ = this.query$.pipe(\n  debounceTime(250),\n  distinctUntilChanged(),\n  switchMap(q => this.http.get<SearchResult[]>(\'/api/search\', { params: { q } }))\n);"}'),
('angular-rx-signal','rec-angular-reference-guide','standard','angular-rxjs','toSignal()','<p>Expose the latest Observable value through a signal.</p>',50,'{"code":"users = toSignal(this.users$, { initialValue: [] });"}');

-- ============================================================================
-- LIFECYCLE
-- ============================================================================
INSERT INTO content_nodes (id, record_id, type, parent_id, title, description, sort_order, metadata)
VALUES
('angular-life-init','rec-angular-reference-guide','standard','angular-lifecycle','ngOnInit','<p>Runs once after Angular initializes component inputs.</p>',10,'{"code":"ngOnInit() {\n  this.load();\n}"}'),
('angular-life-changes','rec-angular-reference-guide','standard','angular-lifecycle','ngOnChanges','<p>Runs when component inputs change.</p>',20,'{"code":"ngOnChanges(changes: SimpleChanges) {\n  console.log(changes);\n}"}'),
('angular-life-render','rec-angular-reference-guide','standard','angular-lifecycle','afterNextRender','<p>Run work after Angular finishes the next application render to the DOM.</p>',30,'{"code":"afterNextRender(() => {\n  // DOM-dependent work\n});"}'),
('angular-life-destroy','rec-angular-reference-guide','standard','angular-lifecycle','DestroyRef','<p>Register cleanup close to setup code.</p>',40,'{"code":"private destroyRef = inject(DestroyRef);\n\nconstructor() {\n  this.destroyRef.onDestroy(() => cleanup());\n}"}');

-- ============================================================================
-- TESTING
-- ============================================================================
INSERT INTO content_nodes (id, record_id, type, parent_id, title, description, sort_order, metadata)
VALUES
('angular-test-run','rec-angular-reference-guide','standard','angular-testing','Run Tests','<p>Run the workspace test target.</p>',10,'{"code":"ng test"}'),
('angular-test-unit','rec-angular-reference-guide','standard','angular-testing','Simple Unit Test','<p>Basic expectation syntax.</p>',20,'{"code":"describe(\'math\', () => {\n  it(\'adds\', () => {\n    expect(2 + 3).toBe(5);\n  });\n});"}'),
('angular-test-bed','rec-angular-reference-guide','standard','angular-testing','TestBed Component','<p>Configure/import a standalone component and create a fixture.</p>',30,'{"code":"await TestBed.configureTestingModule({\n  imports: [Profile],\n}).compileComponents();\n\nconst fixture = TestBed.createComponent(Profile);"}'),
('angular-test-dom','rec-angular-reference-guide','standard','angular-testing','Rendered DOM','<p>Wait for Angular stability before asserting async rendering.</p>',40,'{"code":"const fixture = TestBed.createComponent(Profile);\nawait fixture.whenStable();\nconst el = fixture.nativeElement as HTMLElement;\nexpect(el.querySelector(\'h1\')?.textContent).toContain(\'Profile\');"}'),
('angular-test-http','rec-angular-reference-guide','standard','angular-testing','HTTP Testing','<p>Mock the HTTP backend rather than calling the real network.</p>',50,'{"code":"TestBed.configureTestingModule({\n  providers: [provideHttpClient(), provideHttpClientTesting()],\n});\n\nconst httpTesting = TestBed.inject(HttpTestingController);"}');

-- ============================================================================
-- BUILD / UPDATE
-- ============================================================================
INSERT INTO content_nodes (id, record_id, type, parent_id, title, description, sort_order, metadata)
VALUES
('angular-build-prod','rec-angular-reference-guide','standard','angular-build','Production Build','<p>Create optimized application output.</p>',10,'{"code":"ng build\nng build --configuration production"}'),
('angular-build-dist','rec-angular-reference-guide','standard','angular-build','Inspect Output','<p>Generated files normally live under <code>dist/</code>.</p>',20,'{"code":"ls -la dist"}'),
('angular-build-update','rec-angular-reference-guide','standard','angular-build','Check Updates','<p>List Angular package updates and migrations.</p>',30,'{"code":"ng update"}'),
('angular-build-core','rec-angular-reference-guide','standard','angular-build','Update Framework + CLI','<p>Update Angular packages together and run migrations.</p>',40,'{"code":"ng update @angular/core @angular/cli"}'),
('angular-build-deploy','rec-angular-reference-guide','standard','angular-build','ng deploy','<p>Works after installing a deployment integration that supplies a deploy builder.</p>',50,'{"code":"ng deploy"}');

-- ============================================================================
-- BEST PRACTICES
-- ============================================================================
INSERT INTO content_nodes (id, record_id, type, parent_id, title, content, sort_order, metadata)
VALUES
('angular-practice-standalone','rec-angular-reference-guide','standard','angular-practices','Standalone-first','<p>Use standalone components and application providers for new work. Learn NgModules for maintenance and compatibility.</p>',10,'{}'),
('angular-practice-inject','rec-angular-reference-guide','standard','angular-practices','Prefer inject()','<p>Current Angular style guidance prefers <code>inject()</code> for dependency injection in new code.</p>',20,'{}'),
('angular-practice-signals','rec-angular-reference-guide','standard','angular-practices','Signals for local state','<p>Use writable signals for local state and <code>computed()</code> for derived state. Use effects only for appropriate side effects.</p>',30,'{}'),
('angular-practice-for','rec-angular-reference-guide','standard','angular-practices','Track @for items','<p>Track a stable identity such as <code>track item.id</code> to minimize DOM replacement.</p>',40,'{}'),
('angular-practice-components','rec-angular-reference-guide','standard','angular-practices','Keep components focused','<p>Move reusable data/business behavior to services or plain TypeScript functions rather than bloating components.</p>',50,'{}'),
('angular-practice-lazy','rec-angular-reference-guide','standard','angular-practices','Lazy-load deliberately','<p>Lazy-load routes when it improves initial load cost; do not split tiny features without measuring the tradeoff.</p>',60,'{}'),
('angular-practice-types','rec-angular-reference-guide','standard','angular-practices','Keep types strong','<p>Use interfaces/types for API payloads, inputs, forms, and route data. Avoid defaulting to <code>any</code>.</p>',70,'{}'),
('angular-practice-security','rec-angular-reference-guide','standard','angular-practices','Respect Angular security boundaries','<p>Keep Angular current, avoid constructing templates from user input, and be cautious with APIs that bypass sanitization.</p>',80,'{}'),
('angular-practice-update','rec-angular-reference-guide','standard','angular-practices','Stay current','<p>Run <code>ng update</code>, read release notes, and use the Update Guide instead of skipping many major versions.</p>',90,'{}');

-- ============================================================================
-- TROUBLESHOOTING GRID
-- ============================================================================
INSERT INTO content_nodes (id, record_id, type, parent_id, title, content, sort_order, metadata)
VALUES
('angular-trouble-ng','rec-angular-reference-guide','standard','angular-troubleshoot','ng: command not found','<p>Check <code>which node</code>, <code>which npm</code>, and <code>npm prefix -g</code>. Install Angular CLI under the active nvm Node version.</p>',10,'{}'),
('angular-trouble-node','rec-angular-reference-guide','standard','angular-troubleshoot','Unsupported Node','<p>Run <code>node -v</code> and <code>ng version</code>. Angular 22 needs Node 22.22.3+, 24.15+, or 26.x.</p>',20,'{}'),
('angular-trouble-port','rec-angular-reference-guide','standard','angular-troubleshoot','Port 4200 Used','<p>Use <code>ng serve --port 4300</code>. On macOS inspect the owner with <code>lsof -i :4200</code>.</p>',30,'{}'),
('angular-trouble-import','rec-angular-reference-guide','standard','angular-troubleshoot','Unknown Element / Pipe','<p>In standalone code, confirm the dependency appears in the component <code>imports</code>.</p>',40,'{}'),
('angular-trouble-binding','rec-angular-reference-guide','standard','angular-troubleshoot','Cannot Bind Property','<p>The component/directive input may not be imported, or the binding name may be incorrect.</p>',50,'{}'),
('angular-trouble-di','rec-angular-reference-guide','standard','angular-troubleshoot','NullInjectorError','<p>A requested dependency has no provider in the active injector hierarchy. Check root, app, route, or component providers.</p>',60,'{}'),
('angular-trouble-route','rec-angular-reference-guide','standard','angular-troubleshoot','Route Never Reached','<p>Router matching is first-match wins. Put specific routes before generic routes and put <code>**</code> last.</p>',70,'{}'),
('angular-trouble-cors','rec-angular-reference-guide','standard','angular-troubleshoot','CORS Error','<p>CORS is a browser/server policy. Configure the backend or a development proxy rather than changing HttpClient syntax.</p>',80,'{}'),
('angular-trouble-view','rec-angular-reference-guide','standard','angular-troubleshoot','View Not Updating','<p>In zoneless Angular, changes need an Angular-recognized notification path such as signals, input changes, template events, or supported async mechanisms.</p>',90,'{}'),
('angular-trouble-update','rec-angular-reference-guide','standard','angular-troubleshoot','After an Angular Update','<p>Review migration output, reinstall from the lockfile, run <code>ng test</code>, then run <code>ng build</code>.</p>',100,'{}');

-- ============================================================================
-- DOCUMENTATION LINK LIST
-- ============================================================================
INSERT INTO content_nodes (id, record_id, type, parent_id, title, nav_label, content, sort_order, metadata)
VALUES
('angular-doc-home','rec-angular-reference-guide','standard','angular-docs','Angular Home','Open Angular Home','<p>Current Angular documentation, tutorials, guides, APIs, and ecosystem.</p>',10,'{"url":"https://angular.dev/"}'),
('angular-doc-install','rec-angular-reference-guide','standard','angular-docs','Installation','Open Installation','<p>Node prerequisites, CLI installation, and first project.</p>',20,'{"url":"https://angular.dev/installation"}'),
('angular-doc-local','rec-angular-reference-guide','standard','angular-docs','Local Setup','Open Local Setup','<p>Detailed CLI environment and workspace setup.</p>',30,'{"url":"https://angular.dev/tools/cli/setup-local"}'),
('angular-doc-cli','rec-angular-reference-guide','standard','angular-docs','CLI Reference','Open CLI Reference','<p>Complete <code>ng</code> command reference.</p>',40,'{"url":"https://angular.dev/cli"}'),
('angular-doc-versions','rec-angular-reference-guide','standard','angular-docs','Version Compatibility','Open Compatibility','<p>Angular, Node.js, TypeScript, and RxJS compatibility.</p>',50,'{"url":"https://angular.dev/reference/versions"}'),
('angular-doc-release','rec-angular-reference-guide','standard','angular-docs','Releases','Open Releases','<p>Supported versions and release schedule.</p>',60,'{"url":"https://angular.dev/reference/releases"}'),
('angular-doc-update','rec-angular-reference-guide','standard','angular-docs','Update Guide','Open Update Guide','<p>Interactive version-to-version migration guidance.</p>',70,'{"url":"https://angular.dev/update-guide"}'),
('angular-doc-components','rec-angular-reference-guide','standard','angular-docs','Components','Open Components','<p>Component anatomy and authoring.</p>',80,'{"url":"https://angular.dev/guide/components"}'),
('angular-doc-inputs','rec-angular-reference-guide','standard','angular-docs','Inputs','Open Inputs','<p><code>input()</code>, required inputs, transforms, and compatibility APIs.</p>',90,'{"url":"https://angular.dev/guide/components/inputs"}'),
('angular-doc-outputs','rec-angular-reference-guide','standard','angular-docs','Outputs','Open Outputs','<p><code>output()</code>, emit, event binding, and compatibility APIs.</p>',100,'{"url":"https://angular.dev/guide/components/outputs"}'),
('angular-doc-templates','rec-angular-reference-guide','standard','angular-docs','Templates','Open Templates','<p>Template syntax and control flow.</p>',110,'{"url":"https://angular.dev/guide/templates"}'),
('angular-doc-signals','rec-angular-reference-guide','standard','angular-docs','Signals','Open Signals','<p><code>signal()</code>, <code>computed()</code>, effects, and reactive contexts.</p>',120,'{"url":"https://angular.dev/guide/signals"}'),
('angular-doc-di','rec-angular-reference-guide','standard','angular-docs','Dependency Injection','Open DI','<p>Providers, injectors, services, and <code>inject()</code>.</p>',130,'{"url":"https://angular.dev/guide/di"}'),
('angular-doc-routing','rec-angular-reference-guide','standard','angular-docs','Routing','Open Routing','<p>Routes, outlets, links, guards, lazy loading, and route state.</p>',140,'{"url":"https://angular.dev/guide/routing"}'),
('angular-doc-forms','rec-angular-reference-guide','standard','angular-docs','Forms','Open Forms','<p>Reactive and template-driven forms.</p>',150,'{"url":"https://angular.dev/guide/forms"}'),
('angular-doc-signalforms','rec-angular-reference-guide','standard','angular-docs','Signal Forms','Open Signal Forms','<p>Signal-based forms and current stability guidance.</p>',160,'{"url":"https://angular.dev/guide/forms/signals/overview"}'),
('angular-doc-http','rec-angular-reference-guide','standard','angular-docs','HTTP','Open HTTP','<p>HttpClient, requests, interceptors, configuration, and testing.</p>',170,'{"url":"https://angular.dev/guide/http"}'),
('angular-doc-testing','rec-angular-reference-guide','standard','angular-docs','Testing','Open Testing','<p>Current Vitest-based default test setup.</p>',180,'{"url":"https://angular.dev/guide/testing"}'),
('angular-doc-zoneless','rec-angular-reference-guide','standard','angular-docs','Zoneless','Open Zoneless','<p>Default zoneless change detection model.</p>',190,'{"url":"https://angular.dev/guide/zoneless"}'),
('angular-doc-style','rec-angular-reference-guide','standard','angular-docs','Style Guide','Open Style Guide','<p>Angular team naming, structure, and dependency injection recommendations.</p>',200,'{"url":"https://angular.dev/style-guide"}'),
('angular-doc-security','rec-angular-reference-guide','standard','angular-docs','Security','Open Security','<p>Angular security model, sanitization, XSS protections, and security guidance.</p>',210,'{"url":"https://angular.dev/best-practices/security"}'),
('angular-doc-language','rec-angular-reference-guide','standard','angular-docs','Angular Language Service','Open Language Service','<p>Editor completion and Angular template diagnostics.</p>',220,'{"url":"https://angular.dev/tools/language-service"}');
