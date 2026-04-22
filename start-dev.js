#!/usr/bin/env node
/**
 * Auto-start script for development
 * Starts both the Vite frontend and Node.js email server
 */

const { spawn } = require('child_process');
const path = require('path');
const waitOn = require('wait-on');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(color, message) {
  console.log(`${color}[${new Date().toLocaleTimeString()}] ${message}${colors.reset}`);
}

async function startServices() {
  const processes = [];

  try {
    log(colors.cyan, 'Starting Droply Development Environment...');
    log(colors.white, '');

    // Start Email Server (Node.js)
    log(colors.blue, 'Starting Email Server on Port 3001...');
    const emailServer = spawn('node', ['emailServer.js'], {
      cwd: __dirname,
      stdio: 'inherit',
      shell: true,
    });
    processes.push(emailServer);

    // Wait a bit for email server to start
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Start Vite Frontend
    log(colors.green, 'Starting Vite Frontend on Port 5173...');
    const vite = spawn('npm', ['run', 'dev'], {
      cwd: __dirname,
      stdio: 'inherit',
      shell: true,
    });
    processes.push(vite);

    log(colors.green, '');
    log(colors.green, 'Development environment started!');
    log(colors.white, '');
    log(colors.yellow, 'Email Server:  http://localhost:3001');
    log(colors.yellow, 'Frontend:      http://localhost:5173');
    log(colors.white, '');
    log(colors.cyan, 'Press Ctrl+C to stop all services');

    // Handle process termination
    process.on('SIGINT', () => {
      log(colors.yellow, 'Shutting down services...');
      processes.forEach(proc => {
        if (proc && !proc.killed) {
          proc.kill();
        }
      });
      process.exit(0);
    });

  } catch (error) {
    log(colors.red, `Error: ${error.message}`);
    processes.forEach(proc => {
      if (proc && !proc.killed) {
        proc.kill();
      }
    });
    process.exit(1);
  }
}

startServices();
