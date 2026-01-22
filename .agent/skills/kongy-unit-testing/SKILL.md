---
name: unit-testing
description: Helper for writing and running frontend unit tests with Vitest. Use this skill when implementing new features, bug fixes, or improving code quality.
---

# Frontend Unit Testing Skill

Guide for ensuring code quality in the Konga Manager frontend using **Vitest**.

## When to use this skill

- **New Features**: When adding new functions to `utils`, `services`, or `store`.
- **Bug Fixes**: When reproducing a bug with a test case before fixing it.
- **Refactoring**: When ensuring changes didn't break existing logic.
- **CI/CD**: When running the test suite locally before pushing.

## How to use it

### 1. Running Tests

Execute from the `frontend/` directory:

```bash
npm test:run         # Single run
npm test             # Watch mode
npm run test:coverage # Coverage report
```

### 2. Writing Test Files

Create `*.test.ts` files co-located with source files.

#### Utilities (Pure Functions)
```typescript
import { describe, it, expect } from 'vitest';
import { myUtil } from './index';

describe('myUtil', () => {
  it('should return correct value', () => {
    expect(myUtil('input')).toBe('expected');
  });
});
```

#### Services (Mocking)
Mock dependencies specifically, reset modules between tests.

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { api } from './api';

describe('API Service', () => {
  beforeEach(async () => {
    vi.resetModules();
    global.fetch = vi.fn();
    // Re-import singleton
    // const mod = await import('./api');
  });

  it('calls fetch correctly', async () => {
    (global.fetch as any).mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    await api.getServices();
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/kong/services'), expect.any(Object));
  });
});
```

### 3. Conventions

1.  **Isolation**: Use `vi.resetModules()` in `beforeEach` for singletons (`api`, `store`, `auth`).
2.  **Mocks**: Use `vi.stubGlobal` for browser globals (`localStorage`, `location`).
3.  **Assertions**: Use standard Jest/Vitest matchers (`toBe`, `toEqual`, `toHaveBeenCalledWith`).
