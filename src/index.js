import sucrase from 'sucrase'
import { addImportToAST, astFromCode, codeFromAST, walker } from './ast.js'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'

const __dirname = dirname(fileURLToPath(import.meta.url))

export const DEFAULT_TRANSPILED_IDENTIFIERS = ['_jsx', '_jsxs']

export function readSourceFile(file) {
  const source = readFileSync(file, 'utf8')
  return sucrase.transform(source, {
    transforms: ['typescript', 'jsx'],
    jsxImportSource: 'preact',
    jsxRuntime: 'automatic',
  }).code
}

/**
 * @param {string} sourceCode the javascript/typescript source code to look for islands in
 * @param {object} options
 * @param {typeof isFunctionIsland} options.isFunctionIsland a function that validates a functional node to classify it
 * as an island or not, returns a truthy value if it finds an island in the passed AST. Defaults to the `isFunctionIsland` export from this library
 * @returns {import(".").IslandNode[]}
 */
export function findIslands(
  sourceCode,
  { isFunctionIsland: isFunctionIslandFn = isFunctionIsland } = {}
) {
  const JSX_PRAGMA_REGEX = /((\@jsx)|(\@pragma))\s?(\w+)/
  const JSX_FRAGMENT_PRAGMA_REGEX = /((\@jsxFrag)|(\@pragmaFrag))\s?(\w+)/
  const hasTopLevelJSXPragma = JSX_PRAGMA_REGEX.test(sourceCode)
  const hasTopLevelJSXFragmentPragma =
    JSX_FRAGMENT_PRAGMA_REGEX.test(sourceCode)

  const ast = astFromCode(sourceCode)
  const exportedNodes = getExportedNodes(ast.body)

  let islands = []

  const transpiledIdentifiers = [...DEFAULT_TRANSPILED_IDENTIFIERS]

  if (hasTopLevelJSXPragma) {
    const values = JSX_PRAGMA_REGEX.exec(sourceCode)
    transpiledIdentifiers.push(values[4])
  }

  if (hasTopLevelJSXFragmentPragma) {
    const values = JSX_FRAGMENT_PRAGMA_REGEX.exec(sourceCode)
    transpiledIdentifiers.push(values[4])
  }

  for (let [id, nodeItem] of exportedNodes.entries()) {
    const node = nodeItem.node
    if (
      node.declaration.type === 'FunctionDeclaration' &&
      isFunctionIslandFn(node.declaration, {
        transpiledIdentifiers,
      })
    ) {
      islands.push({
        id,
        node: nodeItem.node,
        nodeItem,
      })
    }

    if (
      node.declaration.type == 'VariableDeclaration' &&
      node.declaration.declarations.some(
        x =>
          x.type == 'VariableDeclarator' &&
          x.init.type == 'ArrowFunctionExpression'
      )
    ) {
      const functionNode = node.declaration.declarations.find(
        x =>
          x.type == 'VariableDeclarator' &&
          x.init.type == 'ArrowFunctionExpression'
      )
      if (
        isFunctionIslandFn(functionNode.init, {
          transpiledIdentifiers,
        })
      ) {
        islands.push({
          id,
          node: nodeItem.node,
          nodeItem,
          ast,
        })
      }
    }
  }

  return islands
}

export function islandNodeToTemplate(island) {
  const finalAST = {
    type: 'Program',
    body: [island.node.declaration],
  }

  const addImport = addImportToAST(finalAST)
  addImport('h', 'preact', { named: true })
  addImport('Fragment', 'preact', { named: true })

  const serverTemplate = generateServerTemplate(island.id)
  finalAST.body = finalAST.body.concat(...astFromCode(serverTemplate).body)

  const serverCode = codeFromAST(finalAST)
  const clientCode = generateClientTemplate(island.id)

  return {
    server: serverCode,
    client: clientCode,
  }
}

export function getExportedNodes(astBody) {
  const nonExportedNodes = new Map()
  const exportedNodes = new Map()

  const nodeProcessQueue = astBody
    .slice()
    .map((x, i) => ({ node: x, ind: i, count: 0 }))

  for (let nodeItem of nodeProcessQueue) {
    const { node, count } = nodeItem
    // if the process queue has had the node more than once,
    // don't process it
    if (count >= 3) {
      continue
    }

    if (node.type !== 'ExportNamedDeclaration') {
      if (node.id && node.id.type === 'Identifier') {
        nonExportedNodes.set(node.id.name, nodeItem)
      }
      continue
    }

    // Collection of specifiers
    if (node.specifiers.length > 0) {
      // external module exported, ignore
      if (node.source) {
        continue
      }

      for (let spec of node.specifiers) {
        if (spec.local && spec.local.type == 'Identifier') {
          if (nonExportedNodes.has(spec.local.name)) {
            exportedNodes.set(
              spec.exported.name,
              nonExportedNodes.get(spec.local.name)
            )
          } else {
            nodeProcessQueue.push({
              ...nodeItem,
              count: nodeItem.count + 1,
            })
          }
        }
      }

      continue
    }

    // exports a node
    if (node.declaration) {
      // Exports a function || Exports a variable
      if (
        node.declaration.type == 'FunctionDeclaration' ||
        node.declaration.type == 'VariableDeclaration'
      ) {
        if (node.declaration.id && node.declaration.id.type === 'Identifier') {
          exportedNodes.set(node.declaration.id.name, nodeItem)
        } else if (node.declaration.declarations?.length > 0) {
          node.declaration.declarations.forEach(node => {
            if (node.id?.type === 'Identifier') {
              exportedNodes.set(node.id.name, nodeItem)
            }
          })
        }
      }

      continue
    }
  }

  return exportedNodes
}

export function generateServerTemplate(name) {
  const islandName = getIslandName(name)

  const code = `
    function Island${name}(props) {
      return h(
        Fragment,
        {},
        h(
          "${islandName}",
          {
            "data-props":JSON.stringify(props)
          },
          h(${name},props),
          h("script",{src:"<~{${name}}~>",type:"module",defer:true})
        )
      )
    }

    export { Island${name} as ${name} }
  `

  return code
}

/**
 * NOT-PURE
 * Modifies the original AST to include the
 * passed island item, replacing the original ast
 * @param {import("acorn").Program} sourceAST
 * @param {import(".").IslandNode} island
 * @param {typeof generateServerTemplate} templateGenerator
 */
export function injectIslandAST(
  sourceAST,
  island,
  templateGenerator = generateServerTemplate
) {
  const astBody = sourceAST.body
  astBody.forEach((item, index) => {
    if (item !== island.node) {
      return
    }
    const serverTemplate = templateGenerator(island.id)
    const islandItem = astFromCode(serverTemplate).body
    astBody.splice(index, 1, island.node.declaration, ...islandItem)
  })
}

export function generateClientTemplate(name) {
  const islandName = getIslandName(name)

  // prettier-ignore
  const __inline_file = readFileSync(join(__dirname, "./dom-restore.js"),"utf8");

  return `
  import { render, h } from 'preact';
  
  ${__inline_file}

  init()
  
  function init(){
    if(customElements.get("${islandName}")){
      return
    }
    customElements.define("${islandName}", class Island${name} extends HTMLElement {
      constructor(){
        super();
      }
    
      async connectedCallback() {
          const c = await import("<~~{importPath}~~>");
          const usableComponent = c["${name}"]
          const props = JSON.parse(this.dataset.props  || '{}');
          this.baseProps = props
          this.component = usableComponent
          this.renderOnView({threshold:0.2})              
      }
    
      renderOnView({threshold} = {}){
        const options = {
          root: null,
          threshold,
        };
    
        const self = this;
    
        const callback = function(entries, observer) {
           entries.forEach((entry) => {
            if(!entry.isIntersecting) return
            self.renderIsland()
           });
        }
    
        let observer = new IntersectionObserver(callback, options);
        observer.observe(this);
      }
    
      renderIsland(){
        mergePropsWithDOM(this, this.baseProps);
        render(restoreTree(this.component, this.baseProps), this, undefined)
      }
    })
  }`
}

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
  functionAST,
  { transpiledIdentifiers = ['_jsx', '_jsxs'] } = {}
) {
  // If it's not a block, then it's an immediate return
  // and would need to be explicity defined as an island since it's
  // not possible for us to assume if the passed down props are functions
  // or not
  if (!(functionAST.body && functionAST.body.type === 'BlockStatement')) {
    return false
  }

  const functionBody = functionAST.body.body || []

  if (!functionBody.length) return false

  // validate if there's a return statement that gives a JSX type element
  // before going down any further to look for triggers and invocations
  const hasReturn = functionBody.find(x => x.type === 'ReturnStatement')
  if (!hasReturn) {
    return false
  }

  const hasReturnRuntimeJSXTransformed =
    hasReturn.argument.type === 'CallExpression' &&
    transpiledIdentifiers.includes(hasReturn.argument.callee.name)

  const hasReturnJSX = ['JSXFragment', 'JSXElement'].includes(
    hasReturn.argument.type
  )

  if (!hasReturnJSX && !hasReturnRuntimeJSXTransformed) {
    return false
  }

  const internalTriggers = []
  let isIsland = false

  functionBody.forEach(statement => {
    if (statement.type == 'FunctionDeclaration') {
      internalTriggers.push(statement.id.name)
    }
    if (statement.type == 'VariableDeclaration') {
      const hasArrow = statement.declarations.find(
        x => x.init.type === 'ArrowFunctionExpression'
      )
      if (!hasArrow) {
        return
      }
      internalTriggers.push(hasArrow.id.name)
    }
  })

  walker(functionAST, {
    Identifier(node) {
      if (/(use[A-Z])/.test(node.name)) {
        isIsland = true
      }
    },
    ReturnStatement(node) {
      walker(node, {
        Identifier(_node) {
          if (_node.name && internalTriggers.includes(_node.name)) {
            isIsland = true
          }
        },
        ArrowFunctionExpression(_node) {
          isIsland = true
        },
      })
    },
    JSXAttribute(node) {
      if (
        node.value &&
        node.value.type === 'JSXExpressionContainer' &&
        (node.value.expression.type === 'ArrowFunctionExpression' ||
          (node.value.expression.type == 'Identifier' &&
            internalTriggers.includes(node.value.expression.name)))
      ) {
        isIsland = true
      }
    },
  })

  return isIsland
}

export function getIslandName(name) {
  return `island${name.replace(/([A-Z])/g, '-$1').toLowerCase()}`
}
