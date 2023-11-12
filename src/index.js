import sucrase from 'sucrase'
import { addImportToAST, astFromCode, codeFromAST, walker } from './ast.js'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export function readSourceFile(file) {
  const source = readFile(file, 'utf8')
  return sucrase.transform(source, {
    transforms: ['typescript', 'jsx'],
    jsxImportSource: 'preact',
    jsxRuntime: 'automatic',
  }).code
}

export function findIslands(sourceCode) {
  const ast = astFromCode(sourceCode)
  const exportedNodes = getExportedNodes(ast.body)

  let islands = []

  for (let [id, nodeItem] of exportedNodes.entries()) {
    const node = nodeItem.node
    if (
      node.declaration.type === 'FunctionDeclaration' &&
      isFunctionIsland(node.declaration)
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
      if (isFunctionIsland(functionNode.init)) {
        islands.push({
          id,
          node: nodeItem.node,
          nodeItem,
        })
      }
    }
  }

  return islands
}

export function islandNodeToTemplate(island) {
  const finalAST = {
    type: 'Program',
    body: [island.declaration],
  }

  const addImport = addImportToAST(ast)
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

export function generateClientTemplate(name) {
  const islandName = getIslandName(name)

  // prettier-ignore
  const __inline_file = fs.readFileSync(join(__dirname, "./dom-restore.js"),"utf8");

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

export function isFunctionIsland(functionAST) {
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
  if (!['JSXFragment', 'JSXElement'].includes(hasReturn.argument.type)) {
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
