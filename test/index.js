/* eslint-env mocha */
// import { it, before, after, beforeEach, afterEach } from 'arrow-mocha/es5'
import { it, beforeEach } from 'arrow-mocha/es5'

import Firedux from '../src'
import { createStore, applyMiddleware, combineReducers } from 'redux'
import thunk from 'redux-thunk'
import assert from 'assert'
import { ref, url } from './ref'

describe('test', t => {
  let firedux
  let reducer
  let store
  let middleware

  beforeEach(t => {
    firedux = new Firedux({
      ref
    })

    reducer = combineReducers({
      app: (s = {}) => s,
      firedux: firedux.reducer()
    })

    middleware = applyMiddleware(thunk)

    store = createStore(reducer, middleware)

    firedux.dispatch = store.dispatch
  })

  it('should get url from ref', (t) => {
    assert.equal(firedux.url, url)
  })

  it('should set and get', (t, done) => {
    t.timeout(10000)

    store.subscribe(() => {
      const state = store.getState()
      console.log('STATE:', JSON.stringify(state, null, '  '))
      assert.equal(state.firedux.data.test, true)
    })

    firedux.set('test', true)
    .then(() => {
      return firedux.get('test')
    })
    .then((result) => {
      assert.equal(result.snapshot.val(), true)
      done()
    })
    .catch(done)
  })

  it('should replace on set', (t, done) => {
    t.timeout(10000)

    store.subscribe(() => {
      const state = store.getState()
      console.log('STATE:', JSON.stringify(state, null, '  '))
    })

    firedux.set('set', {first: true})
    .then(() => {
      const p = firedux.set('set', {second: true})
      const state = store.getState()
      assert.deepEqual(state.firedux.data.set, {second: true})
      return p
    })
    .then(() => {
      return firedux.get('set')
    })
    .then((result) => {
      assert.deepEqual(result.snapshot.val(), {second: true})
      done()
    })
    .catch(done)
  })

  it('should merge on update', (t, done) => {
    t.timeout(10000)

    store.subscribe(() => {
      const state = store.getState()
      console.log('STATE:', JSON.stringify(state, null, '  '))
    })

    firedux.set('update', {first: true})
    .then(() => {
      const p = firedux.update('update', {second: true})
      const state = store.getState()
      assert.deepEqual(state.firedux.data.update, {first: true, second: true}, 'local state')
      return p
    })
    .then(() => {
      return firedux.get('update')
    })
    .then((result) => {
      done()
    })
    .catch(done)
  })

  it('should push with key', (t, done) => {
    t.timeout(10000)

    firedux.push('push', {first: true}, id => {
      assert.ok(id)
    })
    .then((id) => {
      assert.ok(id)
      done()
    })
    .catch(done)
  })
})
