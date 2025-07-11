#!/bin/bash
set -e

echo "Starting git operations..."

# First, try to complete the rebase
if [ -d ".git/rebase-merge" ]; then
    echo "Rebase in progress, attempting to continue..."
    GIT_EDITOR=true git rebase --continue || {
        echo "Rebase continue failed, aborting rebase..."
        git rebase --abort
    }
fi

# Check current branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "Current branch: $CURRENT_BRANCH"

# Stage all changes
echo "Staging all changes..."
git add -A

# Check if there are changes to commit
if ! git diff --cached --quiet; then
    echo "Committing changes..."
    git commit -m "Resolve conflicts and complete Kaspa integration" --no-verify
fi

# Push to origin
echo "Pushing to origin..."
if [ "$CURRENT_BRANCH" = "cursor/integrate-kaspa-cryptocurrency-support-2a54" ]; then
    git push origin cursor/integrate-kaspa-cryptocurrency-support-2a54 --force-with-lease
else
    echo "Not on expected branch, pushing current branch..."
    git push origin "$CURRENT_BRANCH" --force-with-lease
fi

echo "Operations completed successfully!"