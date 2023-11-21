import { test } from 'uvu'
import * as assert from 'uvu/assert'
import { findIslands } from '../src/index.js'

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

test.run()
