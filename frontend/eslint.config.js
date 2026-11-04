import { readdirSync } from 'node:fs';
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// Every folder in src/features is a vertical slice.
const features = readdirSync(new URL('./src/features', import.meta.url), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

/**
 * Slice boundaries (paths are resolved, so both `@/...` and relative imports are checked):
 * 1. A slice must not import from another slice.
 * 2. Outside a slice, only its public API (`index.ts`) may be imported.
 *    Exception: shared/test may import each slice's `mocks/handlers.ts` for the MSW server.
 * 3. shared/lib and shared/ui must not import from slices or from app.
 */
const sliceZones = features.flatMap((name) => [
  {
    target: `./src/features/${name}`,
    from: './src/features',
    except: [`./${name}`],
    message: 'Slices must not import from each other. Move shared code to src/shared.',
  },
  {
    target: './src/app',
    from: `./src/features/${name}`,
    except: ['./index.ts'],
    message: `Import the "${name}" slice only through its public API: @/features/${name}`,
  },
  {
    target: './src/shared/test',
    from: `./src/features/${name}`,
    except: ['./mocks/handlers.ts'],
    message: 'Test infrastructure may only import mocks/handlers.ts from a slice.',
  },
]);

const sharedZones = [
  {
    target: ['./src/shared/lib', './src/shared/ui'],
    from: ['./src/features', './src/app'],
    message: 'Shared code must not depend on slices or on the app shell.',
  },
];

export default tseslint.config(
  { ignores: ['dist', 'coverage'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      import: importPlugin,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    settings: {
      'import/resolver': {
        typescript: { project: './tsconfig.app.json' },
      },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'import/no-restricted-paths': ['error', { zones: [...sliceZones, ...sharedZones] }],
    },
  },
  {
    // Route modules and test helpers export non-components by design.
    files: ['src/**/routes.tsx', 'src/app/router.tsx', 'src/shared/test/**', '**/*.test.tsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
  {
    files: ['vite.config.ts', 'eslint.config.js'],
    languageOptions: { globals: globals.node },
  },
  prettier,
);
