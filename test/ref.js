/* eslint-env mocha */
// import { it, before, after, beforeEach, afterEach } from 'arrow-mocha/es5'
import { it, beforeEach } from 'arrow-mocha/es5'

import Firedux from '../src'
import Firebase from 'firebase'
import { createStore, applyMiddleware, combineReducers } from 'redux'
import thunk from 'redux-thunk'
import assert from 'assert'

describe('ref', t => {
  let firedux
  let reducer
  let store

  it('should init and detect url', t => {
    var url = 'https://redux-firebase.firebaseio.com/'
    var ref = new Firebase(url)
    firedux = new Firedux({
      ref
    })
    assert.equal(firedux.url, url)
  })
})
