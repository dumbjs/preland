import { test } from 'uvu'
import * as assert from 'uvu/assert'
import { findIslands, injectIslandAST } from '../src/index.js'
import { codeFromAST } from '../src/ast.js'

test('inject island code into the existing ast', () => {
  const islands = findIslands(`
      // @jsx h
      import { h } from "preact";
      import { useState } from "preact/hooks";

      const counter = 0;

      export const Component = () => {
        const onClick = () => {};
        return h("button", { onClick: onClick, children: "hello" });
      };
  
      export const Component2 = () => {
        const [state, setState] = useState(0)
        return h("button", { children: state });
      }
      `)

  assert.equal(islands.length, 2)

  islands.forEach(island => {
    injectIslandAST(island.ast, island)
  })

  const code = codeFromAST(islands[0].ast)
  assert.ok(code.includes('IslandComponent'))
  assert.ok(code.includes('IslandComponent2'))
  assert.ok(code.includes('const counter'))
  assert.not.ok(code.includes('export const Component'))
  assert.not.ok(code.includes('export const Component2'))
})

test.run()
