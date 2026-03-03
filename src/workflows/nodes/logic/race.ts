import type { NodeDefinition } from '../registry.ts';

export const raceNode: NodeDefinition = {
  type: 'logic.race',
  label: 'Race',
  description: 'Pass through whichever input branch arrives first; tag the winner with timing metadata.',
  category: 'logic',
  icon: '🏁',
  color: '#f59e0b',
  configSchema: {
    timeout_ms: {
      type: 'number',
      label: 'Timeout (ms)',
      description: 'If no branch completes within this time, the node fails.',
      required: true,
      default: 30000,
    },
  },
  inputs: ['default'],
  outputs: ['winner'],
  execute: async (input, config, ctx) => {
    const timeoutMs = typeof config.timeout_ms === 'number' ? config.timeout_ms : 30000;
    const arrivedAt = Date.now();

    ctx.logger.info(`Race node: input arrived (timeout was ${timeoutMs}ms)`);

    // In graph execution, all inputs to this node are collected by the executor.
    // The race semantics mean the first completed branch's data is what we receive.
    // We tag the output with timing metadata.
    return {
      data: {
        ...input.data,
        race_winner: true,
        race_arrived_at: arrivedAt,
        race_timeout_ms: timeoutMs,
      },
      route: 'winner',
    };
  },
};
