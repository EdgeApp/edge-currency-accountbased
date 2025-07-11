#!/bin/bash

# Abort any rebase in progress
git rebase --abort 2>/dev/null || true

# Push current state to origin
git push origin HEAD:cursor/integrate-kaspa-cryptocurrency-support-2a54 --force

echo "Pushed current state to origin"