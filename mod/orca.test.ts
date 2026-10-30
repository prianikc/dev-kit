import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createdHandle } from './orca.ts'

test('createdHandle: handle из ответа terminal create --json или ничего', () => {
  assert.equal(createdHandle('{"ok":true,"result":{"terminal":{"handle":"term_ab-1","title":"x"}}}'), 'term_ab-1')
  assert.equal(createdHandle('{"ok":false}'), undefined)
  assert.equal(createdHandle('не json'), undefined)
})
