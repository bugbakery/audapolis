#!/bin/bash

# this script creates a .ico file for windows and a .icns file for macOS (that electron-builder)
# also uses to create the linux icons. This is a bit hairy, because macOS and linux want padding
# around the icon while windows wants no padding

set -eu

inkscape icon.svg -w 1024 -h 1024 --export-area='50:50:462:462' -o icon_no_padding.png
npx png2icons icon_no_padding.png icon -icowe -bc -i
rm -rf icon_no_padding.png

inkscape icon.svg -w 1024 -h 1024 -o icon_padding.png
npx png2icons icon_padding.png icon -icns -bc -i
rm -rf icon_padding.png
