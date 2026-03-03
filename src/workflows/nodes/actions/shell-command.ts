import type { NodeDefinition } from '../registry.ts';

export const shellCommandAction: NodeDefinition = {
  type: 'action.shell_command',
  label: 'Shell Command',
  description: 'Execute a shell command and capture its output.',
  category: 'action',
  icon: '💻',
  color: '#3b82f6',
  configSchema: {
    command: {
      type: 'template',
      label: 'Command',
      description: 'Shell command to run. Supports template expressions.',
      required: true,
      placeholder: 'echo "Hello {{data.name}}"',
    },
    timeout_ms: {
      type: 'number',
      label: 'Timeout (ms)',
      description: 'Maximum execution time before the process is killed.',
      required: false,
      default: 30000,
    },
  },
  inputs: ['default'],
  outputs: ['default'],
  execute: async (input, config, ctx) => {
    const command = String(config.command ?? '');
    if (!command) throw new Error('command is required');
    const timeoutMs = typeof config.timeout_ms === 'number' ? config.timeout_ms : 30000;

    ctx.logger.info(`Shell command: ${command.slice(0, 120)}`);

    // Use Bun.spawn with /bin/sh -c to support full shell syntax
    const proc = Bun.spawn(['/bin/sh', '-c', command], {
      stdout: 'pipe',
      stderr: 'pipe',
    });

    // Race between process exit and timeout (with proper cleanup)
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`Shell command timed out after ${timeoutMs}ms`)), timeoutMs);
    });

    let exitCode: number | null = null;
    try {
      exitCode = await Promise.race([proc.exited, timeoutPromise]);
    } catch (err) {
      proc.kill();
      throw err;
    } finally {
      clearTimeout(timer);
    }

    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();

    const success = exitCode === 0;
    if (!success) {
      ctx.logger.warn(`Shell command exited with code ${exitCode}: ${stderr.slice(0, 200)}`);
    }

    return {
      data: {
        ...input.data,
        exit_code: exitCode,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        success,
        command,
      },
    };
  },
};
