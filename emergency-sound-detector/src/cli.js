#!/usr/bin/env node

const readline = require('readline');
const { EmergencySoundDetector } = require('./emergency-sound-detector');

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Initialize detector
let detector = null;
let running = false;

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bold: '\x1b[1m'
};

// Print welcome message
console.log(`${colors.bold}${colors.cyan}=====================================${colors.reset}`);
console.log(`${colors.bold}${colors.cyan} Emergency Sound Detection CLI${colors.reset}`);
console.log(`${colors.bold}${colors.cyan}=====================================${colors.reset}`);

function printHelp() {
  console.log('\nAvailable commands:');
  console.log(`${colors.green}start${colors.reset} - Start the emergency sound detection`);
  console.log(`${colors.red}stop${colors.reset} - Stop the emergency sound detection`);
  console.log(`${colors.blue}status${colors.reset} - Check the current status`);
  console.log(`${colors.yellow}help${colors.reset} - Show this help message`);
  console.log(`${colors.magenta}exit${colors.reset} - Exit the program\n`);
}

// Print help information
printHelp();

// Handle commands
function processCommand(command) {
  switch(command.trim().toLowerCase()) {
    case 'start':
      startDetection();
      break;
    case 'stop':
      stopDetection();
      break;
    case 'status':
      showStatus();
      break;
    case 'help':
      printHelp();
      break;
    case 'exit':
      exitProgram();
      break;
    default:
      console.log(`${colors.red}Unknown command: ${command}${colors.reset}`);
      printHelp();
  }
}

// Start emergency sound detection
async function startDetection() {
  if (running) {
    console.log(`${colors.yellow}Emergency sound detection is already running.${colors.reset}`);
    return;
  }

  console.log(`${colors.cyan}Starting emergency sound detection...${colors.reset}`);
  
  try {
    detector = new EmergencySoundDetector();
    
    // Set up detection event handler
    detector.on('detection', (detections) => {
      detections.forEach(detection => {
        const timestamp = new Date(detection.timestamp).toLocaleTimeString();
        console.log(`\n${colors.bold}${colors.red}EMERGENCY SOUND DETECTED!${colors.reset}`);
        console.log(`${colors.bold}Category:${colors.reset} ${detection.category}`);
        console.log(`${colors.bold}Class:${colors.reset} ${detection.class}`);
        console.log(`${colors.bold}Confidence:${colors.reset} ${Math.round(detection.score * 100)}%`);
        console.log(`${colors.bold}Time:${colors.reset} ${timestamp}`);
        console.log(`${colors.bold}${colors.yellow}Please take appropriate action!${colors.reset}\n`);
      });
    });
    
    await detector.start();
    running = true;
    console.log(`${colors.green}Emergency sound detection started successfully.${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}Failed to start detection:${colors.reset}`, error.message);
  }
}

// Stop emergency sound detection
function stopDetection() {
  if (!running) {
    console.log(`${colors.yellow}Emergency sound detection is not running.${colors.reset}`);
    return;
  }

  try {
    detector.stop();
    running = false;
    console.log(`${colors.green}Emergency sound detection stopped.${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}Failed to stop detection:${colors.reset}`, error.message);
  }
}

// Show current status
function showStatus() {
  if (running) {
    console.log(`${colors.green}Emergency sound detection is currently active.${colors.reset}`);
  } else {
    console.log(`${colors.yellow}Emergency sound detection is currently inactive.${colors.reset}`);
  }
}

// Exit the program
function exitProgram() {
  if (running && detector) {
    console.log(`${colors.yellow}Stopping emergency sound detection before exit...${colors.reset}`);
    detector.stop();
  }
  console.log(`${colors.cyan}Exiting program. Goodbye!${colors.reset}`);
  rl.close();
  process.exit(0);
}

// Process user input
rl.on('line', (input) => {
  processCommand(input);
  process.stdout.write('> ');
}).on('close', () => {
  exitProgram();
});

// Display prompt
process.stdout.write('> ');

// Handle process termination
process.on('SIGINT', () => {
  console.log('\nReceived SIGINT signal. Shutting down...');
  exitProgram();
}); 