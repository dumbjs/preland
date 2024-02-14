import type { Program, Node, ExportNamedDeclaration } from 'acorn'

type IslandNode = {
  id: string
  node: Node
  nodeItem: ExportNamedDeclaration
  ast: Program
}

export function readSourceFile(file: any): any
/**
 * @param {string} sourceCode the javascript/typescript source code to look for islands in
 * @param {object} options
 * @param {typeof isFunctionIsland} options.isFunctionIsland a function that validates a functional node to classify it
 * as an island or not, returns a truthy value if it finds an island in the passed AST. Defaults to the `isFunctionIsland` export from this library
 * @returns
 */
export function findIslands(
  sourceCode: string,
  {
    isFunctionIsland: isFunctionIslandFn,
  }?: {
    isFunctionIsland: typeof isFunctionIsland
  }
): IslandNode[]
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
 * @returns {boolean}
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

/**
 * NOT-PURE
 * Modifies the original AST to include the
 * passed island item, replacing the original ast
 */
export function injectIslandAST(
  sourceAST: Program,
  island: IslandNode,
  templateGenerator = typeof generateServerTemplate
): void
