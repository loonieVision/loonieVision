# AGENTS.md - Coding Agent Guidelines

## Project Overview

LoonieVision is a Tauri v2 desktop application for viewing CBC GEM Olympic streams. It uses React 19 with TypeScript for the frontend and Rust for the backend.

**Stack:**

- Frontend: React 19 + TypeScript + Vite + Tailwind CSS + Zustand
- Backend: Rust + Tauri v2
- Formatter: oxfmt (Oxc)

## Build Commands

```bash
# Development
npm run dev              # Vite dev server only
npm run tauri:dev        # Full Tauri dev with Rust

# Production Build
npm run build            # TypeScript compile + Vite build
npm run tauri:build      # Build Tauri app for distribution

# Preview
npm run preview          # Preview production build

# Linting/Formatting
npm run lint:tsc         # TypeScript type checking
npm run lint:fmt:check   # Check formatting with oxfmt
npm run fmt              # Auto-format all files with oxfmt
```

## Testing

### Frontend (Vitest)

The frontend uses Vitest 4.0.18 with happy-dom, React Testing Library, and jest-dom matchers.

**Commands:**

```bash
npm test                 # Run tests once
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Run tests with coverage report
```

**Test File Location:**

Tests are co-located with the source files they test:

```
src/
  components/
    ComponentName/
      ComponentName.tsx      # Component
      ComponentName.test.tsx # Test file
  lib/
    utils.ts                 # Utility
    utils.test.ts            # Test file
```

**Testing Guidelines:**

- Import testing utilities explicitly (no globals):
  ```typescript
  import { describe, it, expect, vi } from "vitest";
  import { render, screen } from "@testing-library/react";
  import userEvent from "@testing-library/user-event";
  ```
- Use `describe` blocks to group related tests
- Test file naming: `[filename].test.ts` or `[filename].test.tsx`
- Prefer userEvent over fireEvent for interactions
- Call `userEvent.setup()` in each test to get a fresh userEvent instance
- Mock Tauri APIs using the setup file at `src/test/setup.ts`

**Tauri API Mocks:**

The test setup file (`src/test/setup.ts`) provides mocks for:

- `@tauri-apps/api/core` - `invoke()` function
- `@tauri-apps/api/event` - `listen()` and `emit()` functions
- `window.matchMedia` - Media query mocking
- `IntersectionObserver` and `ResizeObserver`

### Backend (Rust)

The Rust backend uses `#[cfg(test)]` modules for unit tests. Tests are organized within the same file as the code they test.

```bash
# Run Rust tests
cd src-tauri && cargo test

# Run tests with output
cargo test -- --nocapture
```

**Guidelines:**

- Use `#[cfg(test)]` modules at the bottom of each source file
- Prefer `super::*` imports in test modules
- Keep test visibility minimal - don't make items `pub` just for tests
- Use descriptive test names: `test_[function]_[scenario]_[expected_result]`
- Group related tests in the same `mod tests` block

## Code Style Guidelines

### TypeScript/React

- **Components**: Use arrow functions, export at bottom

  ```typescript
  const MyComponent = () => { ... };
  export { MyComponent };
  ```

- **Naming**:
  - Components: PascalCase (`StreamSelector.tsx`)
  - Hooks: camelCase with `use` prefix (`useStreamStore`)
  - Stores: camelCase with `use` prefix + `Store` suffix
  - Types/Interfaces: PascalCase (`OlympicStream`)
  - Variables/Functions: camelCase
  - API fields: snake_case (matches backend)

- **Types**:
  - Prefer `interface` over `type` for object shapes
  - Place all shared types in `src/types/index.ts`
  - Use strict TypeScript settings (see tsconfig.json)

- **State Management**:
  - Use Zustand for all state
  - One store per domain (auth, streams, audio, viewport)
  - Store files in `src/store/[name]Store.ts`

- **Error Handling**:
  - Use try/catch for async operations
  - Store errors as strings in state
  - Format: `error instanceof Error ? error.message : "Default message"`

### Styling (Tailwind CSS)

- Use Tailwind utility classes exclusively
- Common patterns observed:
  - Dark theme: `bg-slate-950`, `bg-slate-900`, `text-slate-400`
  - Layout: `flex`, `h-screen`, `w-screen`, `overflow-hidden`
  - Spacing: `px-4`, `py-3`, `space-x-3`
- No arbitrary values; extend tailwind.config.js if needed

### Rust (Tauri Backend)

- Follow standard Rust naming: `snake_case` for functions/variables, `PascalCase` for types
- Use `anyhow` for error handling
- Commands go in `src-tauri/src/lib.rs` in the `commands` module
- Derive `Serialize`/`Deserialize` for all data structures

## File Organization

```
src/
  components/          # React components
    ComponentName/
      ComponentName.tsx      # Main component
      SubComponent.tsx       # Related sub-components
  store/               # Zustand stores
    [name]Store.ts
  lib/                 # Utilities and hooks
  types/               # TypeScript definitions
    index.ts
  App.tsx
  main.tsx
src-tauri/
  src/
    lib.rs            # Rust backend
    main.rs
```

## Editor Configuration

- Use Oxc VS Code extension (oxc.oxc-vscode)
- Format on save is enabled
- No ESLint - rely on TypeScript strict mode + oxfmt

## Important Notes

- React Compiler is enabled (babel-plugin-react-compiler)
- Tauri v2 requires specific port (1420) in dev mode
- The app integrates with CBC's API - respect their terms of service
- Always handle cleanup in useEffect return functions (especially HLS.js instances)
