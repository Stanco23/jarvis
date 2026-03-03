import type { NodeDefinition } from '../registry.ts';

export const switchNode: NodeDefinition = {
  type: 'logic.switch',
  label: 'Switch',
  description: 'Route to one of multiple cases based on an expression value.',
  category: 'logic',
  icon: '🔃',
  color: '#f59e0b',
  configSchema: {
    expression: {
      type: 'template',
      label: 'Expression',
      description: 'JavaScript expression whose value is matched against cases. Has access to `data`.',
      required: true,
      placeholder: 'data.status',
    },
    cases: {
      type: 'json',
      label: 'Cases',
      description: 'JSON array of string values to match, e.g. ["pending", "active", "done"]. Matched in order against case_0, case_1, ... case_N.',
      required: true,
      default: ['case_a', 'case_b', 'case_c'],
    },
  },
  inputs: ['default'],
  outputs: ['case_0', 'case_1', 'case_2', 'default'],
  execute: async (input, config, ctx) => {
    const expression = String(config.expression ?? '');

    let exprValue: unknown;
    try {
      // eslint-disable-next-line no-new-func
      const fn = new Function('data', 'variables', `"use strict"; return (${expression});`);
      exprValue = fn(input.data, input.variables);
    } catch (err) {
      ctx.logger.warn(`Switch expression evaluation error: ${err instanceof Error ? err.message : String(err)}`);
      exprValue = undefined;
    }

    // Parse cases
    let cases: unknown[] = [];
    if (Array.isArray(config.cases)) {
      cases = config.cases;
    } else if (typeof config.cases === 'string') {
      try { cases = JSON.parse(config.cases); } catch { cases = []; }
    }

    // Match against any number of cases (not limited to 3)
    const matchIndex = cases.findIndex(c => String(c) === String(exprValue));
    const route = matchIndex >= 0 ? `case_${matchIndex}` : 'default';

    ctx.logger.info(`Switch: expression="${exprValue}", matched case ${matchIndex}, route="${route}"`);

    return {
      data: { ...input.data, switch_value: exprValue, switch_route: route },
      route,
    };
  },
};
