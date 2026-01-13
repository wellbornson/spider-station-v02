const { exec } = require('child_process');
const fs = require('fs');

const command = 'npm run build';

const child = exec(command, {
  cwd: process.cwd(),
  env: {
    ...process.env,
    // Force webpack instead of Turbopack
    NEXT_PUBLIC_USE_WEBPACK: 'true',
  }
});

child.stdout.on('data', (data) => {
  fs.appendFileSync('build_attempt.log', `STDOUT: ${data}\n`);
});

child.stderr.on('data', (data) => {
  fs.appendFileSync('build_attempt.log', `STDERR: ${data}\n`);
});

child.on('close', (code) => {
  fs.appendFileSync('build_attempt.log', `Build process exited with code ${code}\n`);

  if (code === 0) {
    // Build completed successfully!
  } else {
    // Build failed. Check build_attempt.log for details.
  }
});