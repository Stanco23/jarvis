import type { NodeDefinition } from '../registry.ts';

export const mergeNode: NodeDefinition = {
  type: 'logic.merge',
  label: 'Merge',
  description: 'Wait for two input branches and merge their data into one output.',
  category: 'logic',
  icon: '🔗',
  color: '#f59e0b',
  configSchema: {},
  inputs: ['input_1', 'input_2'],
  outputs: ['default'],
  execute: async (input, _config, ctx) => {
    ctx.logger.info('Merging inputs');

    // The executor collects data from all incoming edges via Object.assign.
    // We deep-merge by ensuring nested objects don't clobber each other.
    const merged: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input.data)) {
      if (
        key in merged &&
        merged[key] && typeof merged[key] === 'object' && !Array.isArray(merged[key]) &&
        value && typeof value === 'object' && !Array.isArray(value)
      ) {
        merged[key] = { ...(merged[key] as Record<string, unknown>), ...(value as Record<string, unknown>) };
      } else {
        merged[key] = value;
      }
    }

    merged.merged_at = Date.now();
    merged.merge_source_count = Object.keys(input.data).length;

    return {
      data: merged,
    };
  },
};
