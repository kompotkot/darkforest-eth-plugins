#!/usr/bin/env bash

tsc
sed -i "s|\.\/voronoi|https://cdn.skypack.dev/voronoi@1.0.0|" "lib/plugin.js"
