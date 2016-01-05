# firedux
> Firebase + Redux for ReactJS

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

Pending further documentation, see example usage in `test/index.js`.

```js
const firedux = new Firedux({
  url: 'https://redux-firebase.firebaseio.com/'
})

const reducer = combineReducers({
  app: (s = {}) => s,
  firedux: firedux.reducer
})

const store = applyMiddleware(
  thunk
)(createStore)(reducer)

const { dispatch } = store

// Later, you can subscribe to state.
store.subscribe(() => {
  const state = store.getState()
  console.log('Test data from Firebase:', state.firedux.data.test)
  
  // Lazy loading
  // e.g. once authorized, get user data:
  if (state.firedux.auth.auth.uid) {
    firedux.get(dispatch, `users/${state.firedux.auth.auth.uid}`)
  }
})

// Watch a path:
firedux.watch(dispatch, 'users/joe') 
.then(({snapshot}) => {}) 
// state.firedux.data.users.joe
// Note: this promise will only return on the first value, but it'll keep syncing.

// Get:
firedux.get(dispatch, 'posts/123')
.then(({snapshot}) => {})
// state.firedux.data.posts['123']

// Set:
firedux.set(dispatch, 'test', true)
.then(({value}) => {})
// state.firedux.data.test = true

// Update (merging set):
firedux.set(dispatch, 'users/joe', { job: 'developer' })
.then(({value}) => {})
// state.firedux.data.users.joe = { name: 'Joe', job: 'developer' }

// Push (to a collection):
firedux.push(dispatch, 'users', { name: 'Jane' }, (id) => {
  // The ID is immediate, so get it before the push with this callback, if you want.
})
.then((id) => {})

// Remove:
firedux.remove(dispatch, 'users/joe'})
.then(() => {})

// Auth

// Init
// Call this when your app starts, to get existing session, and listen for auth changes
dispatch(firedux.actions.init())
// state.firedux.auth == { auth: { uid: '123' } }
//  etc. `authData` per https://www.firebase.com/docs/web/api/firebase/authwithcustomtoken.html
// or state.firedux.authError = Error

// Login
dispatch(firedux.actions.login({
  email: 'user@example.com',
  password: '123'
}))
// state.firedux.auth or state.firedux.authError

// Logout
dispatch(firedux.actions.logout())
// state.firedux.auth = null
```
