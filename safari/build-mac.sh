#!/usr/bin/env bash
# Run this script on a Mac with Xcode installed to generate the Safari App Extension
set -e
echo "Building Safari Extension for MindCraft..."
xcrun safari-web-extension-converter ./safari/extension \
  --project-location ./safari \
  --app-name "MindCraft" \
  --bundle-identifier "com.mindcraft.safari" \
  --swift \
  --no-prompt
echo "Opening Xcode project..."
open ./safari/MindCraft/MindCraft.xcodeproj
