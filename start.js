/**
 * Airship Skirmish - Development Starter
 * 
 * This script starts both the Vite development server and the multiplayer server.
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Print banner
console.log(`
${colors.bright}${colors.cyan}╔═══════════════════════════════════════════════════════════╗
║                   AIRSHIP SKIRMISH                         ║
║                                                           ║
║  Starting development environment...                       ║
╚═══════════════════════════════════════════════════════════╝${colors.reset}
`);

// Start Vite development server
const viteProcess = spawn('npx', ['vite'], {
  stdio: 'pipe',
  shell: true
});

// Start multiplayer server
const serverProcess = spawn('node', ['server.cjs'], {
  stdio: 'pipe',
  shell: true,
  env: { ...process.env, PORT: '3001' }
});

// Handle Vite output
viteProcess.stdout.on('data', (data) => {
  const lines = data.toString().trim().split('\n');
  lines.forEach(line => {
    console.log(`${colors.green}[VITE]${colors.reset} ${line}`);
  });
});

viteProcess.stderr.on('data', (data) => {
  const lines = data.toString().trim().split('\n');
  lines.forEach(line => {
    console.log(`${colors.red}[VITE ERROR]${colors.reset} ${line}`);
  });
});

// Handle server output
serverProcess.stdout.on('data', (data) => {
  const lines = data.toString().trim().split('\n');
  lines.forEach(line => {
    console.log(`${colors.blue}[SERVER]${colors.reset} ${line}`);
  });
});

serverProcess.stderr.on('data', (data) => {
  const lines = data.toString().trim().split('\n');
  lines.forEach(line => {
    console.log(`${colors.red}[SERVER ERROR]${colors.reset} ${line}`);
  });
});

// Handle process exit
process.on('SIGINT', () => {
  console.log(`\n${colors.yellow}Shutting down development environment...${colors.reset}`);
  
  viteProcess.kill();
  serverProcess.kill();
  
  process.exit(0);
});

// Handle child process exit
viteProcess.on('close', (code) => {
  console.log(`${colors.yellow}Vite process exited with code ${code}${colors.reset}`);
  
  if (serverProcess) {
    serverProcess.kill();
  }
  
  process.exit(code);
});

serverProcess.on('close', (code) => {
  console.log(`${colors.yellow}Server process exited with code ${code}${colors.reset}`);
  
  if (viteProcess) {
    viteProcess.kill();
  }
  
  process.exit(code);
}); 