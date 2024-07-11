import { test } from 'uvu'
import * as assert from 'uvu/assert'
import {
  DEFAULT_TRANSPILED_IDENTIFIERS,
  findIslands,
  isFunctionIsland,
} from '../src/index.js'

test('no islands', () => {
  const islands = findIslands(
    `
      export const Component=()=>{
        return <>{count}</>
      }
    `
  )
  assert.equal(islands.length, 0)
})

test('1 island in arrow and function', () => {
  const islands = findIslands(
    `
      export function Component(){
        const onClick = () => {}
        return <button onClick={onClick} />
      }
    `
  )
  assert.equal(islands.length, 1)

  const islandsArrow = findIslands(
    `
      export const Component=()=>{
        const onClick = () => {}
        return <button onClick={onClick} />
      }
    `
  )
  assert.equal(islandsArrow.length, 1)
})

test('multiple islands in arrow and function', () => {
  const islands = findIslands(
    `
      export function Component(){
        const onClick = () => {}
        return <button onClick={onClick} />
      }

      export function Component2(){
        const onClick = () => {}
        return <button onClick={onClick} />
      }
    `
  )

  assert.equal(islands.length, 2)

  const islandsArrow = findIslands(
    `
    export const Component=()=>{
      const onClick = () => {}
      return <button onClick={onClick} />
    }

      export const Component2=()=>{
        const onClick = () => {}
        return <button onClick={onClick} />
      }
    `
  )
  assert.equal(islandsArrow.length, 2)
})

test('transformed runtime: automatic, no triggers', () => {
  const islands = findIslands(`
  import { jsx as _jsx } from "preact/jsx-runtime";

  export const Component = () => {
    return _jsx("button", { children: "hello" });
  };`)

  assert.equal(islands.length, 0)
})

test('transformed runtime: automatic, referenced trigger', () => {
  const islands = findIslands(`
  import { jsx as _jsx } from "preact/jsx-runtime";

  export const Component = () => {
    const onClick = () => {};
    return _jsx("button", { onClick: onClick, children: "hello" });
  };
  `)

  assert.equal(islands.length, 1)
})

test('transformed runtime: automatic, inline trigger', () => {
  const islands = findIslands(`
  import {jsx as _jsx} from "preact/jsx-runtime";
  export const Component = () => {
    return _jsx('button', { onClick: ()=>{console.log()}, children: "hello"})
  };`)

  assert.equal(islands.length, 1)
})

test('transformed runtime: automatic, referenced trigger, multi export, 1 island', () => {
  const islands = findIslands(`
  import {jsx as _jsx} from "preact/jsx-runtime";
  export function Component(){
    const onClick = () => {}
    return _jsx('button', { onClick: onClick,} )
  }

  export function Component2(){
    return _jsx('p', { children: "hello"})
  }
  `)

  assert.equal(islands.length, 1)
})

test('transformed runtime: automatic, referenced trigger, all islands', () => {
  const islands = findIslands(`
  
  import {jsx as _jsx} from "preact/jsx-runtime";
  export function Component(){
    const onClick = () => {}
    return _jsx('button', { onClick: onClick,} )
  }s

  export function Component2(){
    const onClick = () => {}
    return _jsx('button', { onClick: onClick,} )
  }
  `)

  assert.equal(islands.length, 2)
})

test('transformed runtime: manual, pragma h, no triggers', () => {
  const islands = findIslands(`
// @jsx h
import { h } from "preact";
function comp() {
  return h("button", null);
}`)

  assert.equal(islands.length, 0)
})

test('transformed runtime: classic, pragma:h , referenced trigger', () => {
  const islands = findIslands(`
    // @jsx h
    import { h } from "preact";
    export const Component = () => {
      const onClick = () => {};
      return h("button", { onClick: onClick, children: "hello" });
    };`)

  assert.equal(islands.length, 1)
})

test('transformed runtime: classic, pragma:h , referenced trigger, multi component, 1 island', () => {
  const islands = findIslands(`
    // @jsx h
    import { h } from "preact";
    export const Component = () => {
      const onClick = () => {};
      return h("button", { onClick: onClick, children: "hello" });
    };

    export const Component2 = () => {
      return h("button", { children: "hello" });
    }
    `)

  assert.equal(islands.length, 1)
})

test('transformed runtime: classic, pragma:h , referenced trigger, multi component, all islands', () => {
  const islands = findIslands(`
    // @jsx h
    import { h } from "preact";
    import { useState } from "preact/hooks";
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
})

test('nested islands', () => {
  const islands = findIslands(
    `
      export const Component = ({onClick})=>{
        return <button onClick={onClick}></button>
      }
      export const Component2 = () => {
        return <Component onClick={()=>{}}/>
      }
    `
  )

  assert.equal(islands.length, 1)
})

test('multiple exports with islands', () => {
  const islands = findIslands(
    'var _jsxFileName = "/Users/sid/code/adex/playground/src/components/app/MainSiderbar.jsx";\n' +
      "import { Sidebar } from '../Sidebar';\n" +
      "import { marked } from 'marked';\n" +
      "import { signal } from '@preact/signals';\n" +
      'import { jsxDEV as _jsxDEV } from "preact/jsx-dev-runtime";\n' +
      'const md = String.raw;\n' +
      'export const sidebarItems = [{\n' +
      "  key: 'introduction',\n" +
      "  label: 'Introduction',\n" +
      '  content: await marked.parse(md`\n' +
      '### Introduction</h3>\n' +
      '\n' +
      '**_Adex_** is a vite plugin to simplify server rendered apps your development\n' +
      'with preact.\n' +
      '    `)\n' +
      '}, {\n' +
      "  key: 'getting-started',\n" +
      "  label: 'Getting Started',\n" +
      '  content: await marked.parse(md`\n' +
      '### Getting Started\n' +
      '    `)\n' +
      '}];\n' +
      'export const activeSidebar = signal(sidebarItems[0].key);\n' +
      'export const MainSidebar = () => {\n' +
      '  return _jsxDEV(Sidebar, {\n' +
      '    activeSidebar: activeSidebar,\n' +
      '    setSidebar: key => {\n' +
      '      activeSidebar.value = key;\n' +
      '    },\n' +
      '    sidebarItems: sidebarItems\n' +
      '  }, void 0, false, {\n' +
      '    fileName: _jsxFileName,\n' +
      '    lineNumber: 31,\n' +
      '    columnNumber: 5\n' +
      '  }, this);\n' +
      '};',
    {
      isFunctionIsland: ast =>
        isFunctionIsland(ast, {
          transpiledIdentifiers:
            DEFAULT_TRANSPILED_IDENTIFIERS.concat('_jsxDEV'),
        }),
    }
  )

  assert.equal(islands.length, 1)
})

test.run()
