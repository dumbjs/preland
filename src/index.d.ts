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
/**
 *
 * @param {import("acorn").Node} functionAST
 * @param {object} options
 * @param {string[]} options.transpiledIdentifiers , identifiers to look for when
 * searching the function ast. These are generally `_jsx` and `_jsxs` when working with
 * the `automatic` JSX Runtime in bundlers but might differ in your scenario
 * @returns
 */
export function isFunctionIsland(
  functionAST: import('acorn').Node,
  {
    transpiledIdentifiers,
  }?: {
    transpiledIdentifiers: string[]
  }
): boolean
export function getIslandName(name: any): string
export const DEFAULT_TRANSPILED_IDENTIFIERS: string[]
