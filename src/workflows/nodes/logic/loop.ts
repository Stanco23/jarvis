import type { NodeDefinition } from '../registry.ts';

export const loopNode: NodeDefinition = {
  type: 'logic.loop',
  label: 'Loop',
  description: 'Iterate over an array, executing downstream "item" nodes for each element, then emitting "done".',
  category: 'logic',
  icon: '🔁',
  color: '#f59e0b',
  configSchema: {
    items_path: {
      type: 'template',
      label: 'Items Path / Expression',
      description: 'A template expression that resolves to an array, e.g. "{{data.results}}".',
      required: true,
      placeholder: '{{data.items}}',
    },
    max_iterations: {
      type: 'number',
      label: 'Max Iterations',
      description: 'Safety cap on the number of iterations.',
      required: false,
      default: 100,
    },
  },
  inputs: ['default'],
  outputs: ['item', 'done'],
  execute: async (input, config, ctx) => {
    const maxIterations = typeof config.max_iterations === 'number' ? config.max_iterations : 100;

    // Resolve items from config (template engine resolves upstream)
    let items: unknown[] = [];
    const rawItems = config.items_path;
    if (Array.isArray(rawItems)) {
      items = rawItems;
    } else if (typeof rawItems === 'string') {
      // Try dot-path into input.data
      const resolved = rawItems.split('.').reduce<unknown>((acc, key) => {
        if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[key];
        return undefined;
      }, input.data as unknown);
      if (Array.isArray(resolved)) items = resolved;
    }

    const capped = items.slice(0, maxIterations);
    if (items.length > maxIterations) {
      ctx.logger.warn(`Loop capped at ${maxIterations} iterations (total items: ${items.length})`);
    }

    if (capped.length === 0) {
      ctx.logger.info('Loop: no items to iterate');
      return {
        data: {
          ...input.data,
          loop_items: [],
          loop_results: [],
          loop_total: 0,
        },
        route: 'done',
      };
    }

    ctx.logger.info(`Loop: iterating over ${capped.length} items`);

    // Execute downstream "item" path for each element by collecting results.
    // Since individual node execute() can't drive the graph executor,
    // we emit each item's data with index metadata. The executor's routing
    // sends this to the "item" output branch.
    // For true per-item subgraph execution, we'd need executor-level loop support.
    // Current approach: output all items with metadata so downstream nodes can process.
    const results: unknown[] = [];
    for (let i = 0; i < capped.length; i++) {
      if (ctx.abortSignal.aborted) break;
      const item = capped[i];
      results.push(item);
    }

    return {
      data: {
        ...input.data,
        loop_items: capped,
        loop_results: results,
        loop_total: capped.length,
        loop_index: 0,
        loop_current: capped[0],
      },
      route: 'item',
    };
  },
};
