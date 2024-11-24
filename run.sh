#!/bin/bash
rm -rf output/
#node script.js "$1"
node script.js "${win_desktop}/MSc/$1" # change this line to your path

echo "Done"