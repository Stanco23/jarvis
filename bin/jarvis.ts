#!/usr/bin/env bun
/**
 * J.A.R.V.I.S. CLI Entry Point
 *
 * Usage:
 *   jarvis start [--port N] [--foreground]  Start the daemon
 *   jarvis stop                             Stop the running daemon
 *   jarvis status                           Show daemon status
 *   jarvis onboard                          Interactive setup wizard
 *   jarvis doctor                           Check environment & connectivity
 *   jarvis version                          Print version
 *   jarvis help                             Show this help
 */

import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import { existsSync } from 'node:fs';
import { writePid, readPid, clearPid, isRunning, getLogPath } from '../src/daemon/pid.ts';
import { c } from '../src/cli/helpers.ts';

const PACKAGE_ROOT = join(import.meta.dir, '..');

function getVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(join(PACKAGE_ROOT, 'package.json'), 'utf-8'));
    return pkg.version || '0.0.0';
  } catch {
    return '0.0.0';
  }
}

function printHelp(): void {
  console.log(`
${c.cyan('J.A.R.V.I.S.')} ${c.dim(`v${getVersion()}`)}
Just A Rather Very Intelligent System

${c.bold('Usage:')}
  jarvis <command> [options]

${c.bold('Commands:')}
  ${c.cyan('start')}     Start the JARVIS daemon
  ${c.cyan('stop')}      Stop the running daemon
  ${c.cyan('restart')}   Restart the daemon (stop + start)
  ${c.cyan('status')}    Show daemon status
  ${c.cyan('logs')}      Tail the daemon log file
  ${c.cyan('update')}    Update JARVIS to the latest version
  ${c.cyan('onboard')}   Interactive first-time setup wizard
  ${c.cyan('doctor')}    Check environment and connectivity
  ${c.cyan('version')}   Print version number
  ${c.cyan('help')}      Show this help message

${c.bold('Start options:')}
  --port <N>        Override daemon port (default: 3142)
  --foreground      Run in foreground (don't daemonize)
  --no-open         Don't auto-open dashboard in browser

${c.bold('Logs options:')}
  -f, --follow      Follow log output (like tail -f)
  -n, --lines <N>   Number of lines to show (default: 50)

${c.bold('Examples:')}
  jarvis start                  Start daemon in background
  jarvis start --foreground     Start in foreground (for debugging)
  jarvis start --port 8080      Start on custom port
  jarvis restart                Restart with same settings
  jarvis logs -f                Follow live log output
  jarvis update                 Update to latest version
  jarvis onboard                Run the setup wizard
  jarvis doctor                 Check if everything is working
`);
}

async function cmdStart(args: string[]): Promise<void> {
  const foreground = args.includes('--foreground');
  const noOpen = args.includes('--no-open');

  // Parse --port
  let port: number | undefined;
  const portIdx = args.indexOf('--port');
  if (portIdx !== -1 && args[portIdx + 1]) {
    port = parseInt(args[portIdx + 1], 10);
    if (isNaN(port)) {
      console.error(c.red('Error: --port requires a number'));
      process.exit(1);
    }
  }

  // Check if already running
  const existingPid = isRunning();
  if (existingPid) {
    console.log(c.yellow(`JARVIS is already running (PID ${existingPid})`));
    console.log(c.dim(`  Stop it first with: jarvis stop`));
    process.exit(1);
  }

  if (foreground) {
    // Run in foreground — just import and call startDaemon
    writePid(process.pid);
    process.on('exit', () => clearPid());
    process.on('SIGINT', () => { clearPid(); process.exit(0); });
    process.on('SIGTERM', () => { clearPid(); process.exit(0); });

    const { startDaemon } = await import('../src/daemon/index.ts');
    await startDaemon({ port, ...(port ? {} : {}) });

    if (!noOpen) {
      openDashboard(port ?? 3142);
    }
  } else {
    // Run in background — spawn a detached child process with log file
    console.log(c.cyan('Starting J.A.R.V.I.S. daemon...'));

    const logPath = getLogPath();
    const logFile = Bun.file(logPath);
    const logWriter = logFile.writer();

    const daemonArgs = [join(PACKAGE_ROOT, 'bin/jarvis.ts'), 'start', '--foreground', '--no-open'];
    if (port) daemonArgs.push('--port', String(port));

    const child = Bun.spawn(['bun', ...daemonArgs], {
      stdio: ['ignore', logWriter, logWriter],
      env: { ...process.env },
    });

    // Wait briefly for the process to start
    await new Promise(resolve => setTimeout(resolve, 1500));

    const runningPid = isRunning();
    if (runningPid) {
      console.log(c.green(`✓ JARVIS daemon started (PID ${runningPid})`));
      console.log(c.dim(`  Dashboard: http://localhost:${port ?? 3142}`));
      console.log(c.dim(`  Logs:      ${logPath}`));
      console.log(c.dim(`  Stop with: jarvis stop`));

      if (!noOpen) {
        openDashboard(port ?? 3142);
      }
    } else {
      console.log(c.red('✗ Failed to start daemon. Check logs:'));
      console.log(c.dim(`  ${logPath}`));
      process.exit(1);
    }
  }
}

function cmdStop(): void {
  const pid = isRunning();
  if (!pid) {
    console.log(c.yellow('JARVIS is not running.'));
    return;
  }

  console.log(c.cyan(`Stopping JARVIS daemon (PID ${pid})...`));
  try {
    process.kill(pid, 'SIGTERM');
    clearPid();
    console.log(c.green('✓ JARVIS daemon stopped.'));
  } catch (err) {
    console.error(c.red(`Failed to stop process ${pid}: ${err}`));
    clearPid();
  }
}

function cmdStatus(): void {
  const pid = isRunning();
  if (pid) {
    console.log(`${c.green('●')} JARVIS is ${c.green('running')} (PID ${pid})`);

    // Try to read the port from config
    try {
      const { homedir } = require('node:os');
      const configPath = join(homedir(), '.jarvis', 'config.yaml');
      const YAML = require('yaml');
      const text = readFileSync(configPath, 'utf-8');
      const cfg = YAML.parse(text);
      const port = cfg?.daemon?.port ?? 3142;
      console.log(c.dim(`  Dashboard: http://localhost:${port}`));
    } catch {
      console.log(c.dim(`  Dashboard: http://localhost:3142`));
    }

    console.log(c.dim(`  Stop with: jarvis stop`));
  } else {
    console.log(`${c.red('●')} JARVIS is ${c.red('stopped')}`);
    console.log(c.dim(`  Start with: jarvis start`));
  }
}

async function cmdOnboard(): Promise<void> {
  const { runOnboard } = await import('../src/cli/onboard.ts');
  await runOnboard();
}

async function cmdDoctor(): Promise<void> {
  const { runDoctor } = await import('../src/cli/doctor.ts');
  await runDoctor();
}

async function cmdRestart(args: string[]): Promise<void> {
  const pid = isRunning();
  if (pid) {
    console.log(c.cyan(`Stopping JARVIS daemon (PID ${pid})...`));
    try {
      process.kill(pid, 'SIGTERM');
      clearPid();
    } catch {
      clearPid();
    }
    // Wait for process to exit
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log(c.green('✓ Stopped.'));
  }

  console.log('');
  await cmdStart(args);
}

function cmdLogs(args: string[]): void {
  const logPath = getLogPath();

  if (!existsSync(logPath)) {
    console.log(c.yellow('No log file found. Start the daemon first: jarvis start'));
    return;
  }

  const follow = args.includes('-f') || args.includes('--follow');

  // Parse --lines / -n
  let lines = 50;
  const nIdx = args.indexOf('-n') !== -1 ? args.indexOf('-n') : args.indexOf('--lines');
  if (nIdx !== -1 && args[nIdx + 1]) {
    const n = parseInt(args[nIdx + 1], 10);
    if (!isNaN(n) && n > 0) lines = n;
  }

  console.log(c.dim(`Log file: ${logPath}\n`));

  if (follow) {
    // tail -f equivalent
    const tailProc = Bun.spawn(['tail', '-f', '-n', String(lines), logPath], {
      stdio: ['ignore', 'inherit', 'inherit'],
    });

    process.on('SIGINT', () => {
      tailProc.kill();
      process.exit(0);
    });
  } else {
    // Just show last N lines
    const tailProc = Bun.spawnSync(['tail', '-n', String(lines), logPath]);
    process.stdout.write(tailProc.stdout);
  }
}

async function cmdUpdate(): Promise<void> {
  console.log(c.cyan('Checking for updates...\n'));

  // Get current version
  const currentVersion = getVersion();
  console.log(`  Current version: ${c.bold(currentVersion)}`);

  // Check if daemon is running (we'll restart it after update)
  const wasRunning = isRunning();

  // Stop daemon if running
  if (wasRunning) {
    console.log(c.dim('  Stopping daemon before update...'));
    try {
      process.kill(wasRunning, 'SIGTERM');
      clearPid();
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch {
      clearPid();
    }
  }

  // Update via git pull + bun install (not npm — package is not published)
  console.log('');
  const gitPull = Bun.spawnSync(['git', 'pull', '--ff-only'], {
    cwd: PACKAGE_ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env },
  });

  if (gitPull.exitCode !== 0) {
    const stderr = gitPull.stderr.toString();
    // If not a git repo, try the install dir
    const installDir = join(require('node:os').homedir(), '.jarvis', 'daemon');
    const gitPull2 = Bun.spawnSync(['git', 'pull', '--ff-only'], {
      cwd: installDir,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env },
    });

    if (gitPull2.exitCode !== 0) {
      console.log(c.red('✗ Update failed (git pull):'));
      console.log(c.dim(`  ${gitPull2.stderr.toString().trim() || stderr.trim()}`));
      if (wasRunning) {
        console.log(c.dim('\n  Restarting daemon...'));
        await cmdStart(['--no-open']);
      }
      process.exit(1);
    }
  }

  // Reinstall dependencies
  const bunInstall = Bun.spawnSync(['bun', 'install'], {
    cwd: PACKAGE_ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env },
  });

  if (bunInstall.exitCode !== 0) {
    console.log(c.yellow('! Dependencies may need manual refresh: bun install'));
  }

  // Get new version
  const newVersion = getVersion();
  if (newVersion === currentVersion) {
    console.log(c.green(`✓ Already on the latest version (${currentVersion})`));
  } else {
    console.log(c.green(`✓ Updated: ${currentVersion} → ${newVersion}`));
  }

  // Restart daemon if it was running
  if (wasRunning) {
    console.log(c.dim('\nRestarting daemon...'));
    await cmdStart(['--no-open']);
  }
}

function openDashboard(port: number): void {
  const url = `http://localhost:${port}`;
  try {
    const platform = process.platform;
    if (platform === 'darwin') {
      Bun.spawn(['open', url], { stdio: ['ignore', 'ignore', 'ignore'] });
    } else {
      // Check WSL first
      const { readFileSync } = require('node:fs');
      try {
        const version = readFileSync('/proc/version', 'utf-8');
        if (version.toLowerCase().includes('microsoft')) {
          Bun.spawn(['wslview', url], { stdio: ['ignore', 'ignore', 'ignore'] });
          return;
        }
      } catch {}
      // Regular Linux
      Bun.spawn(['xdg-open', url], { stdio: ['ignore', 'ignore', 'ignore'] });
    }
  } catch {
    // Silently fail — user can open manually
  }
}

// ── Main ─────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const command = args[0] || 'help';
const commandArgs = args.slice(1);

switch (command) {
  case 'start':
    await cmdStart(commandArgs);
    break;
  case 'stop':
    cmdStop();
    break;
  case 'restart':
    await cmdRestart(commandArgs);
    break;
  case 'status':
    cmdStatus();
    break;
  case 'logs':
  case 'log':
    cmdLogs(commandArgs);
    break;
  case 'update':
  case 'upgrade':
    await cmdUpdate();
    break;
  case 'onboard':
    await cmdOnboard();
    break;
  case 'doctor':
    await cmdDoctor();
    break;
  case 'version':
  case '-v':
  case '--version':
    console.log(getVersion());
    break;
  case 'help':
  case '-h':
  case '--help':
    printHelp();
    break;
  default:
    console.error(c.red(`Unknown command: ${command}`));
    console.log(c.dim('Run "jarvis help" for usage information.'));
    process.exit(1);
}
