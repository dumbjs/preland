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

test.run()
