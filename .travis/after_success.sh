#!/bin/bash

npm run verb

[ "${TRAVIS_PULL_REQUEST}" = "true" ] && exit 1

git config user.name "Travis CI"
git config user.email "AndersDJohnson@users.noreply.github.com"

[ $? -ne 0 ] && exit 1
git add README.md
git commit -m "Build README.md."
[ $? -ne 0 ] && exit 1
git push "https://${GITHUB_TOKEN}@github.com/${TRAVIS_REPO_SLUG}.git" $TRAVIS_BRANCH

