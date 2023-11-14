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
