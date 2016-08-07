/* eslint-env mocha */

import firebase from 'firebase'

let ref
let url
if (process.env.FIREBASE_VERSION === '2') {
  url = 'https://redux-firebase.firebaseio.com/'
  ref = new firebase(url)
}
else {
  url = 'https://firedux-3d1a8.firebaseio.com/'
  const config = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: 'firedux-3d1a8.firebaseapp.com',
    databaseURL: url
  }
  firebase.initializeApp(config)
  ref = firebase.database().ref()
}

export { ref, url }
