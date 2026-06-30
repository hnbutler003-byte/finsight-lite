---
name: Vite ?raw imports in TypeScript
description: How to enable TypeScript support for Vite's ?raw file imports (e.g. importing .md files as strings)
---

To import any file as a raw string in the client (e.g. `import content from '../../../docs/guide.md?raw'`), add `client/src/env.d.ts` containing:

```typescript
/// <reference types="vite/client" />
```

The `vite/client` type package declares `module '*?raw' { const content: string; export default content; }` which satisfies TypeScript. No other config needed.

**Why:** Without this, TS errors on `?raw` imports even though Vite handles them correctly at runtime.

**How to apply:** Any time a new component needs to import a file as raw text (markdown guides, plaintext templates, etc.), ensure `client/src/env.d.ts` exists with this directive before writing the import.
