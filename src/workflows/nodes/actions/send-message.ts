import type { NodeDefinition } from '../registry.ts';

export const sendMessageAction: NodeDefinition = {
  type: 'action.send_message',
  label: 'Send Message',
  description: 'Send a message to a channel: dashboard, Telegram, or Discord.',
  category: 'action',
  icon: '💬',
  color: '#3b82f6',
  configSchema: {
    channel: {
      type: 'select',
      label: 'Channel',
      description: 'Destination channel for the message.',
      required: true,
      default: 'dashboard',
      options: [
        { label: 'Dashboard', value: 'dashboard' },
        { label: 'Telegram', value: 'telegram' },
        { label: 'Discord', value: 'discord' },
      ],
    },
    message: {
      type: 'template',
      label: 'Message',
      description: 'Message content. Supports template expressions.',
      required: true,
      placeholder: 'Hello from JARVIS! Result: {{data.result}}',
    },
  },
  inputs: ['default'],
  outputs: ['default'],
  execute: async (input, config, ctx) => {
    const channel = String(config.channel ?? 'dashboard');
    const message = String(config.message ?? '');
    ctx.logger.info(`Sending message to ${channel}: ${message.slice(0, 100)}`);

    let success = false;

    if (channel === 'dashboard') {
      // Broadcast directly to connected dashboard clients via WebSocket
      if (ctx.broadcast) {
        ctx.broadcast('workflow_message', {
          channel: 'dashboard',
          message,
          executionId: ctx.executionId,
          workflowId: ctx.workflowId,
        });
        success = true;
      } else {
        ctx.logger.warn('No broadcast function available — message logged only');
      }
    } else {
      // Route to Telegram/Discord via tool registry
      const toolName = channel === 'telegram'
        ? 'send_telegram'
        : 'send_discord';

      try {
        if (ctx.toolRegistry.has(toolName)) {
          await ctx.toolRegistry.execute(toolName, { message });
          success = true;
        } else {
          ctx.logger.warn(`Tool '${toolName}' not available — message logged only`);
        }
      } catch (err) {
        ctx.logger.error(`Failed to send message: ${err instanceof Error ? err.message : String(err)}`);
        throw err;
      }
    }

    return {
      data: {
        ...input.data,
        sent: success,
        channel,
        message,
        sentAt: Date.now(),
      },
    };
  },
};
