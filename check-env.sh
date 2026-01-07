#!/bin/bash
echo "Node version:"
node --version 2>&1 || echo "Node not found"
echo ""
echo "NPM version:"
npm --version 2>&1 || echo "NPM not found"
echo ""
echo "PNPM version:"
pnpm --version 2>&1 || echo "PNPM not found"
echo ""
echo "Current directory:"
pwd
echo ""
echo "Files in directory:"
ls -la

