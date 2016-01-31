# firedux
> Firebase + Redux for ReactJS

[![npm](https://img.shields.io/npm/v/firedux.svg)](https://www.npmjs.com/package/firedux)
[![Travis](https://img.shields.io/travis/AndersDJohnson/firedux.svg)](https://travis-ci.org/AndersDJohnson/firedux)

Wraps the [Firebase JavaScript API](https://www.firebase.com/docs/web/api/)
to dispatch Redux actions
that optimisically & immediately read/write to an in-memory
subset of your data from Firebase,
then asynchronously pull & push data in the background.

Also supports authentication methods and actions.

## Install

```
npm i --save firedux
```

You'll need to configure `redux-thunk` on your Redux store.

## Use

Pending further documentation, see example usage below and in `test/index.js`.

```js
import Firedux from 'firedux'
import { createStore, applyMiddleware, combineReducers } from 'redux'
import thunk from 'redux-thunk'

// Create your Firedux instance.
const firedux = new Firedux({
  url: 'https://redux-firebase.firebaseio.com/'

  // Optional:
  omit: ['$localState'] // Properties to reserve for local use and not sync with Firebase.
})

const reducer = combineReducers({
  firedux: firedux.reducer()
  // Your other reducers...
})

// Create store with middleware, including thunk.
const store = applyMiddleware(
  thunk
  // Your other middleware...
)(createStore)(reducer)

// Set dispatch function from store on your Firedux instance.
firedux.dispatch = store.dispatch


// Later, you can subscribe to state.
store.subscribe(() => {
  const state = store.getState()
  const { data, authData } = state.firedux
  console.log('Test data from Firebase:', data.test)

  // Lazy loading
  // e.g. once authorized, get user data:
  if (authData && authData.auth && authData.auth.uid) {
    firedux.watch(`users/${authData.auth.uid}`)
  }
})

// Watch a path:
firedux.watch('users/joe')
.then(({snapshot}) => {})
// state.firedux.data.users.joe
// Note: this promise will only resolve on the first value, but it'll keep syncing on all value updates.

// Get:
firedux.get('posts/123')
.then(({snapshot}) => {})
// state.firedux.data.posts['123']

// Set:
firedux.set('test', true)
.then(({value}) => {})
// state.firedux.data.test = true

// Update (merging set):
firedux.update('users/joe', { job: 'developer' })
.then(({value}) => {})
// state.firedux.data.users.joe = { name: 'Joe', job: 'developer' }

// Push (to a collection):
firedux.push('users', { name: 'Jane' }, (id) => {
  // The ID is generated locally and immediately - you can get it before the push with this callback.
})
.then((id) => {})

// Remove:
firedux.remove('users/joe'})
.then(() => {})

// Auth

// Init
// Call this when your app starts, to get existing session, and listen for auth changes.
firedux.init()
// state.firedux.auth = { auth: { uid: '123' } }
//  etc. `authData` per https://www.firebase.com/docs/web/api/firebase/authwithcustomtoken.html
// or state.firedux.authError = Error

// Login
firedux.login({
  email: 'user@example.com',
  password: '123'
}))
// state.firedux.auth or state.firedux.authError

// Logout
firedux.logout()
// state.firedux.auth = null
```
