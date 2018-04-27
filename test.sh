#!/usr/bin/env sh
for f in projections/*.spec.js; do
    yarn run babel-node $f;
done;