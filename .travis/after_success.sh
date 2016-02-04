#!/bin/bash

npm run verb

git config user.name "Travis CI"
git config user.email "AndersDJohnson@users.noreply.github.com"

if [ $? -ne 0 ]; then exit 1; fi
git add README.md
git commit -m "Build README.md."
if [ $? -ne 0 ]; then exit 1; fi
git push "https://${GITHUB_TOKEN}@github.com/AndersDJohnson/firedux.git"

