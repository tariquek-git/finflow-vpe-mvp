#!/bin/zsh
set -euo pipefail
cd /Users/tarique/Downloads/banking-diagram-mvp
npm install
npm run dev -- --host 127.0.0.1 --port 5173
