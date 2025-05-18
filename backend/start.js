// This script sets the OpenAI API key from the command line and starts the server
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Get API key from command line arguments or use default
const apiKey = process.env.OPENAI_API_KEY || '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';

// Check if we should run the React development server
const runReact = process.argv.includes('--with-react');

// Create a temporary .env file if it doesn't exist
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  fs.writeFileSync(envPath, `OPENAI_API_KEY=${apiKey}\n`);
  console.log('Created .env file with API key');
}

// Start the server
console.log('Starting backend server...');
const server = spawn('node', ['server.js'], {
  env: { ...process.env, OPENAI_API_KEY: apiKey },
  stdio: 'inherit'
});

server.on('close', (code) => {
  console.log(`Server process exited with code ${code}`);
  if (frontendProcess) {
    frontendProcess.kill();
  }
  process.exit(code);
});

// Start React development server if --with-react flag is present
let frontendProcess;
if (runReact) {
  console.log('Starting React development server...');
  
  // Check if the frontend directory exists
  if (fs.existsSync(path.join(__dirname, 'frontend'))) {
    frontendProcess = spawn('npm', ['run', 'dev'], {
      cwd: path.join(__dirname, 'frontend'),
      env: { ...process.env }, // Vite will use the port from vite.config.js
      stdio: 'inherit'
    });

    frontendProcess.on('close', (code) => {
      console.log(`React process exited with code ${code}`);
    });
  } else {
    console.error('Frontend directory not found. Please make sure the frontend directory exists.');
  }
}

// Handle process termination
process.on('SIGINT', () => {
  server.kill('SIGINT');
  if (frontendProcess) {
    frontendProcess.kill('SIGINT');
  }
  process.exit();
});

process.on('SIGTERM', () => {
  server.kill('SIGTERM');
  if (frontendProcess) {
    frontendProcess.kill('SIGTERM');
  }
  process.exit();
}); 