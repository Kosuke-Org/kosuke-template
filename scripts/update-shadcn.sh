#!/bin/bash

# This script only updates components that already exist in ./components/ui/

set -e

echo "🤖 Updating existing shadcn/ui components..."

# Check if components/ui directory exists
if [ ! -d "./components/ui" ]; then
  echo "❌ Error: ./components/ui directory not found"
  exit 1
fi

COMPONENTS=$(ls ./components/ui/*.tsx 2>/dev/null | xargs -n1 basename -s .tsx | tr '\n' ' ')

if [ -z "$COMPONENTS" ]; then
  echo "⚠️  No components found in ./components/ui/"
  exit 0
fi

echo "📦 Found components: $COMPONENTS"

echo "⚡ Updating existing components..."
npx shadcn@canary add -y -o $COMPONENTS

echo "✅ All existing components updated successfully!"
