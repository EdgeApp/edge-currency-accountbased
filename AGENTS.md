# AGENTS.md

## Build/Lint/Test Commands

- `npm run lint` - Run ESLint
- `npm run fix` - Auto-fix ESLint issues
- `npm run types` - TypeScript type checking
- `npm test` - Run all tests
- `npm run test -- test/path/to/file.test.ts` - Run single test
- `npm run nettest` - Run network tests
- `npm run verify` - Full verification (prepare + lint + types + test)

## Code Style Guidelines

- **Imports**: Use `simple-import-sort` (auto-sorted)
- **Formatting**: Prettier config - single quotes, semicolons false, trailing commas none
- **Types**: Strict TypeScript with project references
- **Naming**: camelCase for variables/functions, PascalCase for classes/types
- **Error Handling**: Use `asError` pattern, never throw raw strings
- **Structure**: One class per file, co-locate types with implementations
- **Tests**: Mocha + Chai, use `describe`/`it` blocks, fixtures in `test/fixtures/`

## Git Conventions

- **Atomic commits**: Each commit should be atomic but complete and runnable
- **Conventional commits**: Follow conventional commit standard (without title prefixes)
- **Imperative mood**: Use imperative mood for commit message titles (e.g., "Add feature" not "Added feature")
