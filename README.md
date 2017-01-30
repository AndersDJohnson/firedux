# :fire: :hatching_chick: firedux [![NPM version](https://badge.fury.io/js/firedux.svg)](http://badge.fury.io/js/firedux)  [![Build Status](https://travis-ci.org/adjohnson916/firedux.svg)](https://travis-ci.org/adjohnson916/firedux)  [![Firebase](https://raw.githubusercontent.com/firebase/firebase-chrome-extension/master/icons/icon48.png)](https://www.firebase.com) [![ReactJS](https://raw.githubusercontent.com/facebook/react/master/docs/img/logo_small.png)](https://facebook.github.io/react)

> Firebase + Redux for ReactJS

[![NPM](https://nodei.co/npm/firedux.png)](https://nodei.co/npm/firedux/)

Firedux (_fiery·ducks_) wraps the [Firebase](https://www.firebase.com/) [JavaScript API](https://www.firebase.com/docs/web/api/)
to dispatch [Redux](http://redux.js.org/) actions
that optimisically & immediately read/write to an in-memory
subset of your data from Firebase,
then asynchronously pull & push data in the background.

Also supports some authentication methods and actions.

Works well with [React](https://facebook.github.io/react/).

Support firedux and fiery ducks like Magmar!

![Magmar](docs/magmar.gif)

## Install

Install with [npm](https://www.npmjs.com/)

```sh
$ npm i firedux --save
```

You'll need to configure `redux-thunk` on your Redux store.

The browser build ([`dist/src/index.browser.js`](dist/src/index.browser.js)) should support UMD (AMD, CommonJS, and globals). If using globals with Firebase 2.x you may need to alias `Firebase` as `firebase` prior to loading this module. Other shims may be necessary. Please report any issues or findings.

Dependencies:
* firebase
* lodash: as `_` if using globals
* updeep
* `Promise`: polyfill globally as needed

## Use

See [my TodoMVC example](https://github.com/adjohnson916/firedux-todomvc), the [tests](test/index.js), and below:

```js
import Firedux from 'firedux'
import Firebase from 'firebase'
import { createStore, applyMiddleware, combineReducers } from 'redux'
import thunk from 'redux-thunk'

/**
 * For Firebase 2.x, e.g.:
 */
var ref = new Firebase('https://redux-firebase.firebaseio.com/')

/**
 * Or for Firebase 3.x:, e.g.:
 */
var app = Firebase.initializeApp({
  apiKey: '<your-api-key>',
  authDomain: '<your-auth-domain>',
  databaseURL: 'https://redux-firebase.firebaseio.com/',
  storageBucket: '<your-storage-bucket>'
})
var ref = app.database().ref()

/**
 * Then create your Firedux instance, passing it your database reference as `ref`.
 */
const firedux = new Firedux({
  ref,

  // Optional:
  omit: ['$localState'] // Properties to reserve for local use and not sync with Firebase.
})

const reducer = combineReducers({
  firedux: firedux.reducer()
  // Your other reducers...
})

// Create store with middleware, including thunk.

const middleware = applyMiddleware(
  thunk
  // Your other middleware...
)

const store = createStore(reducer, middleware)

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
// Note: this promise will only resolve on the first value,
//  but it'll keep syncing on all value updates.

// Get:
firedux.get('posts/123')
.then(({snapshot}) => {})
// state.firedux.data.posts['123']

// Set:
firedux.set('test', true)
.then(({value}) => {})
// state.firedux.data.test == true

// Update (merging set):
firedux.update('users/joe', { job: 'developer' })
.then(({value}) => {})
// state.firedux.data.users.joe == { name: 'Joe', job: 'developer' }

// Push (to a collection):
firedux.push('users', { name: 'Jane' }, (id) => {
  // The ID is generated locally immediately,
  // so you can get it before the push with this callback.
  // id == '-K95Cjx-caw2uSNsFJiI'
})
.then((id) => {})
// state.firedux.data.users['-K95Cjx-caw2uSNsFJiI'] == { name: 'Jane' }

// Remove:
firedux.remove('users/joe')
.then(() => {})
// state.firedux.data.users['joe'] == undefined

// Auth

// Init
// Call this when your app starts, to get existing session, and listen for auth changes.
firedux.init()
// See Login state below.

// Login
firedux.login({
  email: 'user@example.com',
  password: '123'
})
// state.firedux.authData == { auth: { uid: '123' } }
//  etc. `authData` per https://www.firebase.com/docs/web/api/firebase/authwithcustomtoken.html
// or state.firedux.authError == Error

// Logout
firedux.logout()
// state.firedux.authData == null

// To handle some unsupported features, you can get access to the underlying Firebase instance via:
firedux.ref
// e.g. turn off a watch:
firedux.ref.child('users/joe').off('value')
// or login with OAuth:
firedux.ref.authWithOAuthPopup("twitter", (error, authData) => {
  store.dispatch({type: 'FIREBASE_LOGIN', error, authData})
})
```

## Analytics

This component includes tracking via Google Analytics.
The purpose is to better understand how and where it's used, as a guide for development.

To opt-out of this tracking, before loading the script on your page,
use the global options in JavaScript, with `noTrack` set to `true`, as follows:

```js
window.FIREDUX_OPTIONS = {
  noTrack: true
};
```

## Running tests

Install dev dependencies:

```sh
$ npm i -d && npm test
```

## Contributing

Pull requests and stars are always welcome. For bugs and feature requests, [please create an issue](https://github.com/adjohnson916/firedux/issues/new).

In lieu of a formal styleguide, please:

* Take care to maintain the existing coding style
* Add unit tests for any new or changed functionality
* Re-build documentation with [verb-cli](https://github.com/assemble/verb-cli) before submitting a pull request.

## Author

**Anders D. Johnson**

+ [github/adjohnson916](https://github.com/adjohnson916)
+ [twitter/adjohnson916](http://twitter.com/adjohnson916)

## License

Copyright © 2015-2016 [Anders D. Johnson](https://github.com/adjohnson916)
Released under the MIT license.

***

_This file was generated by [verb-cli](https://github.com/assemble/verb-cli) on August 6, 2016._
