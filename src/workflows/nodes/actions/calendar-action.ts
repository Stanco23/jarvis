import type { NodeDefinition } from '../registry.ts';

export const calendarActionNode: NodeDefinition = {
  type: 'action.calendar_action',
  label: 'Calendar Action',
  description: 'Create, update, or delete a Google Calendar event.',
  category: 'action',
  icon: '📆',
  color: '#3b82f6',
  configSchema: {
    action: {
      type: 'select',
      label: 'Action',
      description: 'Operation to perform on the calendar.',
      required: true,
      default: 'create',
      options: [
        { label: 'Create', value: 'create' },
        { label: 'Update', value: 'update' },
        { label: 'Delete', value: 'delete' },
      ],
    },
    title: {
      type: 'template',
      label: 'Title',
      description: 'Event title. Supports template expressions.',
      required: true,
      placeholder: 'Team standup',
    },
    start: {
      type: 'template',
      label: 'Start Time',
      description: 'ISO 8601 start datetime. Supports template expressions.',
      required: true,
      placeholder: '2026-03-02T09:00:00Z',
    },
    end: {
      type: 'template',
      label: 'End Time',
      description: 'ISO 8601 end datetime. Supports template expressions.',
      required: true,
      placeholder: '2026-03-02T09:30:00Z',
    },
  },
  inputs: ['default'],
  outputs: ['default'],
  execute: async (input, config, ctx) => {
    const action = String(config.action ?? 'create');
    const title = String(config.title ?? '');
    const start = String(config.start ?? '');
    const end = String(config.end ?? '');

    ctx.logger.info(`Calendar action: ${action} event "${title}" from ${start} to ${end}`);

    let success = false;
    let note = '';

    // Try the google_calendar tool if registered
    const toolName = 'google_calendar';
    if (ctx.toolRegistry.has(toolName)) {
      try {
        await ctx.toolRegistry.execute(toolName, { action, title, start, end });
        success = true;
      } catch (err) {
        throw new Error(`Calendar ${action} failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    } else {
      note = 'Google Calendar tool not configured — set up Google API integration to enable calendar actions';
      ctx.logger.warn(note);
    }

    return {
      data: {
        ...input.data,
        calendar_action: action,
        title,
        start,
        end,
        success,
        note: note || undefined,
        executedAt: Date.now(),
      },
    };
  },
};
