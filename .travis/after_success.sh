#!/bin/bash

[ "${TRAVIS_PULL_REQUEST}" = "true" ] && exit 1

echo "Not a pull request..."
echo "Setting git user..."

git config user.name "Travis CI"
git config user.email "adjohnson916@users.noreply.github.com"

echo "Running verb..."

npm run verb

[ $? -ne 0 ] && exit 1

echo "Verb complete."
echo "Git operations..."

echo "Git checkout... branch=$TRAVIS_BRANCH"
git checkout $TRAVIS_BRANCH

echo "Git add..."
git add README.md
[ $? -ne 0 ] && exit 1
echo "Git commit..."
git commit -m "Build README.md from Travis."
[ $? -ne 0 ] && exit 1
echo "Git push..."
git push -q "https://${GITHUB_TOKEN}@github.com/${TRAVIS_REPO_SLUG}.git" $TRAVIS_BRANCH 2>&1 > /dev/null

