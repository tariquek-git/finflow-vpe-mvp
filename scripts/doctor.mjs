#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';

const projectRoot = path.resolve(process.cwd());

const failures = [];
const warnings = [];

const nodeMajor = Number(process.versions.node.split('.')[0] || '0');
if (nodeMajor < 18) {
  failures.push(`Node ${process.versions.node} is too old. Use Node 18+.`);
}

try {
  const npmVersion = execSync('npm -v', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  if (!npmVersion) {
    warnings.push('Could not determine npm version.');
  }
} catch {
  failures.push('npm is not available on PATH. Install Node.js which includes npm.');
}

for (const rel of ['package.json', 'index.html', 'App.tsx', 'vite.config.ts']) {
  const full = path.join(projectRoot, rel);
  if (!existsSync(full)) {
    failures.push(`Missing required file: ${rel}`);
  }
}

const aiEnabled = `${process.env.VITE_ENABLE_AI || ''}`.toLowerCase() === 'true';
const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || process.env.API_KEY;
if (aiEnabled && !apiKey) {
  warnings.push('VITE_ENABLE_AI=true but VITE_GEMINI_API_KEY is not set. AI generation will fail.');
}
if (!aiEnabled) {
  warnings.push('AI generation is disabled (VITE_ENABLE_AI is not true). This is the public MVP default.');
}

if (warnings.length > 0) {
  console.log('Warnings:');
  for (const warning of warnings) {
    console.log(`- ${warning}`);
  }
  console.log('');
}

if (failures.length > 0) {
  console.error('Doctor found blocking issues:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Doctor check passed. You can run: npm run dev');
