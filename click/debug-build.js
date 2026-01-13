const { spawn } = require('child_process');
const fs = require('fs');

const buildProcess = spawn('npx', ['next', 'build'], {
  cwd: process.cwd(),
  stdio: 'pipe',
  shell: true
});

let stdout = '';
let stderr = '';

buildProcess.stdout.on('data', (data) => {
  const chunk = data.toString();
  stdout += chunk;
});

buildProcess.stderr.on('data', (data) => {
  const chunk = data.toString();
  stderr += chunk;
});

buildProcess.on('close', (code) => {
  fs.writeFileSync('build_debug_output.txt', `Exit Code: ${code}\n\nSTDOUT:\n${stdout}\n\nSTDERR:\n${stderr}`);
});