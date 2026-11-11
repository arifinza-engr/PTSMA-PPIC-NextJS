# Graph Report - web-upgrade-16.4.2  (2026-11-07)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 530 nodes · 1115 edges · 29 communities (25 shown, 4 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.57)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `38562d17`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- produksi.ts
- HasilProduksi.tsx
- requireSameOrigin
- devDependencies
- production-targets.ts
- requireRole
- dependencies
- compilerOptions
- lembur.ts
- auth-roles.ts
- ProduksiForm.tsx
- lembur-upload.ts
- todayWIBISO
- StokOpnameForm.tsx
- ExecutiveDashboard.tsx
- date.ts
- layout.tsx
- validation.ts
- LoginForm.tsx
- test-db.ts
- eslint.config.mjs
- next.config.ts
- { GET, POST }

## God Nodes (most connected - your core abstractions)
1. `requireSameOrigin()` - 57 edges
2. `requireRole()` - 50 edges
3. `cn()` - 27 edges
4. `clean()` - 17 edges
5. `now()` - 17 edges
6. `compilerOptions` - 16 edges
7. `scripts` - 15 edges
8. `allRoles` - 14 edges
9. `submitProduksi()` - 13 edges
10. `updateProductionRecord()` - 13 edges

## Surprising Connections (you probably didn't know these)
- `Session` --references--> `AppRole`  [EXTRACTED]
  types/next-auth.d.ts → lib/auth-roles.ts
- `User` --references--> `AppRole`  [EXTRACTED]
  types/next-auth.d.ts → lib/auth-roles.ts
- `GET()` --calls--> `requireRole()`  [EXTRACTED]
  app/api/produksi/[line]/operators/route.ts → lib/authorize.ts
- `GET()` --calls--> `requireSameOrigin()`  [EXTRACTED]
  app/api/produksi/[line]/operators/route.ts → lib/authorize.ts
- `DELETE()` --calls--> `requireRole()`  [EXTRACTED]
  app/api/produksi/record/[id]/route.ts → lib/authorize.ts

## Import Cycles
- None detected.

## Communities (29 total, 4 thin omitted)

### Community 0 - "produksi.ts"
Cohesion: 0.08
Nodes (50): GET(), DELETE(), errorResponse(), GET(), PUT(), recordId(), runtime, GET() (+42 more)

### Community 1 - "HasilProduksi.tsx"
Cohesion: 0.07
Nodes (43): administrationLinks, operationalLinks, productionProducts, Cell, DataResult, formatCell(), formatDate(), HasilProduksi() (+35 more)

### Community 2 - "requireSameOrigin"
Cohesion: 0.09
Nodes (35): allowed(), DELETE(), GET(), PATCH(), POST(), POST(), runtime, GET() (+27 more)

### Community 3 - "devDependencies"
Cohesion: 0.04
Nodes (47): drizzle-kit, eslint, eslint-config-next, devDependencies, drizzle-kit, eslint, eslint-config-next, playwright (+39 more)

### Community 4 - "production-targets.ts"
Cohesion: 0.06
Nodes (34): Employee, EmployeeForm, EMPTY, MasterTables(), EMPTY, Form, Product, ProductionTargets() (+26 more)

### Community 5 - "requireRole"
Cohesion: 0.12
Nodes (29): GET(), GET(), GET(), err(), GET(), POST(), GET(), runtime (+21 more)

### Community 6 - "dependencies"
Cohesion: 0.06
Nodes (31): drizzle-orm, exceljs, next, next-auth, dependencies, drizzle-orm, exceljs, next (+23 more)

### Community 7 - "compilerOptions"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 8 - "lembur.ts"
Cohesion: 0.19
Nodes (17): DELETE(), parseId(), PATCH(), runtime, GET(), GET(), POST(), deleteLembur() (+9 more)

### Community 9 - "auth-roles.ts"
Cohesion: 0.15
Nodes (11): Account, PasswordEditor(), UserManagement(), AppRole, roleLabels, roles, JWT, next-auth (+3 more)

### Community 10 - "ProduksiForm.tsx"
Cohesion: 0.15
Nodes (14): Choice, Col, columnsFor(), EMPTY, Item, Line, LINE_LABEL, LiniFlags (+6 more)

### Community 11 - "lembur-upload.ts"
Cohesion: 0.24
Nodes (13): maxDuration, POST(), runtime, ALLOWED_TYPES, ensureUploadDir(), fileToBuffer(), generateFilename(), matchesContent() (+5 more)

### Community 12 - "todayWIBISO"
Cohesion: 0.21
Nodes (10): Dashboard(), Choice, LemburForm(), handleRemoveBukti(), onSubmit(), uploadBukti(), selectStyles, toOptions() (+2 more)

### Community 13 - "StokOpnameForm.tsx"
Cohesion: 0.19
Nodes (11): SelectOption, selectStyles, StockMaster, StockPreview, StockRecord, StokOpnameForm(), deleteRecord(), loadRecords() (+3 more)

### Community 14 - "ExecutiveDashboard.tsx"
Cohesion: 0.24
Nodes (12): amountLabel(), ApiError, attainmentClass(), currentMonth(), ExecutiveDashboard(), GroupResult, LineResult, numberFormat (+4 more)

### Community 15 - "date.ts"
Cohesion: 0.26
Nodes (6): Lembur, LemburList(), BULAN_PENDEK, formatTanggalID(), isValidISODate(), todayLocalISO()

### Community 16 - "layout.tsx"
Cohesion: 0.29
Nodes (5): geistMono, geistSans, metadata, Nav(), QueryProvider()

### Community 17 - "validation.ts"
Cohesion: 0.25
Nodes (6): date, decimal, item, nonnegative, productionSchema, time

### Community 18 - "LoginForm.tsx"
Cohesion: 0.53
Nodes (3): LoginForm(), submit(), safeRedirectPath()

## Knowledge Gaps
- **175 isolated node(s):** `Item`, `LineConfig`, `Prod`, `ProductionItemPayload`, `ProductionPayload` (+170 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `requireSameOrigin()` connect `requireSameOrigin` to `lembur.ts`, `produksi.ts`, `lembur-upload.ts`, `requireRole`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **Why does `todayWIBISO()` connect `todayWIBISO` to `produksi.ts`, `HasilProduksi.tsx`, `ProduksiForm.tsx`, `StokOpnameForm.tsx`, `date.ts`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **Why does `db` connect `requireSameOrigin` to `lembur.ts`, `produksi.ts`, `production-targets.ts`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **What connects `Item`, `LineConfig`, `Prod` to the rest of the system?**
  _175 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `produksi.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07932310946589106 - nodes in this community are weakly interconnected._
- **Should `HasilProduksi.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06721311475409836 - nodes in this community are weakly interconnected._
- **Should `requireSameOrigin` be split into smaller, more focused modules?**
  _Cohesion score 0.08853410740203194 - nodes in this community are weakly interconnected._