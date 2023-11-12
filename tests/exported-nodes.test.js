import { test } from 'uvu'
import * as assert from 'uvu/assert'
import { astFromCode } from '../src/ast.js'
import { getExportedNodes } from '../src/index.js'

test('identifies exports', () => {
  const ast = astFromCode(`
    export const a = 1;
    const b = 2;
  `)
  const nodes = getExportedNodes(ast.body)
  assert.ok(nodes.has('a'))
})

test('empty map on no exports', () => {
  const ast = astFromCode(`
    const a = 1;
    const b = 2;
  `)
  const nodes = getExportedNodes(ast.body)
  assert.equal(nodes.size, 0)
})

test.run()
