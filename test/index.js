/* eslint-env mocha */
// import { it, before, after, beforeEach, afterEach } from 'arrow-mocha/es5'
import { it, beforeEach } from 'arrow-mocha/es5'

import Firedux from '../src'
import { createStore, applyMiddleware, combineReducers } from 'redux'
import thunk from 'redux-thunk'
import assert from 'assert'

describe('test', t => {
  let firedux
  let reducer
  let store

  beforeEach(t => {
    firedux = new Firedux({
      url: 'https://redux-firebase.firebaseio.com/'
    })

    reducer = combineReducers({
      app: (s = {}) => s,
      firedux: firedux.reducer()
    })

    store = applyMiddleware(
      thunk
    )(createStore)(reducer)

    firedux.dispatch = store.dispatch
  })

  it('should', (t, done) => {
    t.timeout(10000)

    store.subscribe(() => {
      const state = store.getState()
      console.log('STATE:', JSON.stringify(state, null, '  '))
      assert.equal(state.firedux.data.test, true)
    })

    firedux.set('test', true)
    .then(() => {
      return firedux.get('test')
    }, done)
    .then((result) => {
      assert.equal(result.snapshot.val(), true)
      done()
    }, done)
    .catch(done)
  })
})
