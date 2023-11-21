<p align="center">
    <img width="1200" alt="header" src="https://github.com/dumbjs/preland/assets/43572006/49e9d708-4b88-4922-9094-7ad25d53906e">
</p>

> **Pre**act Is**land**

Framework Agnostic utils to generate atomic islands for preact components

- [What is this?](#what-is-this)
- [Highlights](#highlights)
- [Usage](#usage)
- [API](#api)
  - [`@dumbjs/preland`](#dumbjspreland)
  - [`@dumbjs/preland/ast`](#dumbjsprelandast)
- [License](#license)

## What is this?

`preland` is a set of utilities that allow you to `read`, `find` , `transform`
and `generate` island components for preact. None of the utlities in this set
has any dependency on any bundler or framework and just statically analyses the
given code to look for preact islands.

## Highlights

- Tiny
- Supports [Typescript](https://www.typescriptlang.org)
- Handles individual named island exports from the same file
- Provides utils to help parse and generate preact compatible ASTs and add
  `imports` to it

## Usage

- Installation as simple as adding `@dumbjs/preland` to your dependencies.

  ```sh
  $ npm i @dumbjs/preland@beta
  ```

## API

### `@dumbjs/preland`

```ts
export function readSourceFile(file: any): any
export function findIslands(sourceCode: any): {
  id: any
  node: any
  nodeItem: any
}[]
export function islandNodeToTemplate(island: any): {
  server: any
  client: string
}
export function getExportedNodes(astBody: any): any
export function generateServerTemplate(name: any): string
export function generateClientTemplate(name: any): string
export function isFunctionIsland(
  functionAST: any,
  {
    transpiledIdentifiers,
  }?: {
    transpiledIdentifiers?: string[]
  }
): boolean
export function getIslandName(name: any): string
export const DEFAULT_TRANSPILED_IDENTIFIERS: string[]
```

### `@dumbjs/preland/ast`

```ts
export function walker(ast: any, visitors: any): void
export function astFromCode(code: any): import('acorn').Program
export function codeFromAST(ast: any): any
/**
 * Takes in an AST node and returns the name of the default
 * export for it
 * @param {*} ast
 * @returns
 */
export function getDefaultExportName(ast: any): any
export function getDefaultExport(ast: any): any[]
/**
 * NOT A PURE FUNCTION!
 * modifies the passed AST with the
 * requested import
 *
 * Note:
 * This function does not rename / or add a new identifier for the
 * requested import as that could add in a lot more complexity
 * and is easier handled in the user land. Changing and renaming
 * import specifier would also need proper tranformation to be handled
 * for cases where the imports might be responsible for things
 * like JSX.
 * @returns
 */
export function addImportToAST(ast: any): (
  name: string,
  from: string,
  {
    named,
  }: {
    named: boolean
  }
) => void
export function getNamedExport(ast: any, name: any): any
/**
 * NOT A PURE FUNCTION!
 * removes the export from the passed AST
 */
export function removeExportFromAST(ast: any): (
  name: string,
  options: {
    named: boolean
  }
) => void
export function isTopLevelFunction(parents: any): any
```

## License

[MIT](/LICENSE)
