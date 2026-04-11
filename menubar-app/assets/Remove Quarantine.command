#!/bin/bash
# Double-click this file in Finder to fix the "damaged" Gatekeeper warning.
# It removes the quarantine attribute macOS sets on apps downloaded from the internet.

APP="/Applications/LeetCode Tracker.app"

if [ ! -d "$APP" ]; then
  osascript -e 'display alert "LeetCode Tracker not found" message "Please drag LeetCode Tracker to your Applications folder first, then run this script." as warning'
  exit 1
fi

xattr -dr com.apple.quarantine "$APP"

if [ $? -eq 0 ]; then
  osascript -e 'display alert "Done!" message "Quarantine flag removed. You can now open LeetCode Tracker normally." as informational'
  open "$APP"
else
  osascript -e 'display alert "Permission denied" message "Try running this script again — macOS may need your confirmation." as warning'
fi
