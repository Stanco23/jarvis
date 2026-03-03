import type { NodeDefinition } from '../registry.ts';

export const delayNode: NodeDefinition = {
  type: 'logic.delay',
  label: 'Delay',
  description: 'Pause workflow execution for a specified duration.',
  category: 'logic',
  icon: '⏳',
  color: '#f59e0b',
  configSchema: {
    delay_ms: {
      type: 'number',
      label: 'Delay (ms)',
      description: 'Number of milliseconds to wait before continuing.',
      required: true,
      default: 1000,
    },
  },
  inputs: ['default'],
  outputs: ['default'],
  execute: async (input, config, ctx) => {
    const delayMs = typeof config.delay_ms === 'number' ? Math.max(0, config.delay_ms) : 1000;
    ctx.logger.info(`Delaying for ${delayMs}ms`);

    await new Promise<void>((resolve, reject) => {
      if (ctx.abortSignal.aborted) { reject(new Error('Delay aborted')); return; }
      const onAbort = () => { clearTimeout(timer); reject(new Error('Delay aborted')); };
      const timer = setTimeout(() => {
        ctx.abortSignal.removeEventListener('abort', onAbort);
        resolve();
      }, delayMs);
      ctx.abortSignal.addEventListener('abort', onAbort, { once: true });
    });

    return {
      data: {
        ...input.data,
        delayed_ms: delayMs,
      },
    };
  },
};
