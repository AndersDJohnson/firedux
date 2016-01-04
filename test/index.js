/* eslint-env mocha */
// import { it, before, after, beforeEach, afterEach } from 'arrow-mocha/es5'
import { it } from 'arrow-mocha/es5'

import Firedux from '../src'
import { createStore, applyMiddleware, combineReducers } from 'redux'
import thunk from 'redux-thunk'
import assert from 'assert'

const firedux = new Firedux({
  url: 'https://redux-firebase.firebaseio.com/'
})

const appReducer = (state = {}, action) => {
  return state
}

const reducer = combineReducers({
  app: appReducer,
  firedux: firedux.reducer
})

const createStoreWithMiddleware = applyMiddleware(
  thunk
)(createStore)

const store = createStoreWithMiddleware(reducer)

store.subscribe(() => {
  console.log('STATE:', JSON.stringify(store.getState(), null, '  '))
})

describe('test', t => {
  it('should', (t, done) => {
    t.timeout(10000)
    firedux.set(store.dispatch, 'test', true)
    .then(() => {
      return firedux.get(store.dispatch, 'test')
    }, done)
    .then((result) => {
      console.log('DONE')
      assert.equal(result.snapshot.val(), true)
      done()
    }, done)
    .catch(done)
  })
})
