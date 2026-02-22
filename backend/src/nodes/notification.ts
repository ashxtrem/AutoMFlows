import { BaseNode, EmailNodeData, SlackNodeData, WebhookNodeData } from '@automflows/shared';
import { NodeHandler } from './base';
import { ContextManager } from '../engine/context';
import { VariableInterpolator } from '../utils/variableInterpolator';
import { HttpClient, ApiRequestConfig } from '../utils/httpClient';
import nodemailer from 'nodemailer';

export class EmailHandler implements NodeHandler {
  async execute(node: BaseNode, context: ContextManager): Promise<void> {
    const data = node.data as EmailNodeData;

    if (!data.smtpHost) {
      throw new Error('SMTP Host is required for Email node');
    }
    if (!data.to) {
      throw new Error('Recipient (To) is required for Email node');
    }
    if (!data.subject) {
      throw new Error('Subject is required for Email node');
    }

    const traceLog = context.getData('traceLog') as ((message: string) => void) | undefined;
    const traceLogsEnabled = context.getData('traceLogs') as boolean | undefined;

    const smtpHost = VariableInterpolator.interpolateString(data.smtpHost, context);
    const smtpPort = data.smtpPort || 587;
    const smtpSecure = data.smtpSecure || false;
    const smtpUser = data.smtpUser ? VariableInterpolator.interpolateString(data.smtpUser, context) : undefined;
    const smtpPass = data.smtpPass ? VariableInterpolator.interpolateString(data.smtpPass, context) : undefined;
    const from = data.from ? VariableInterpolator.interpolateString(data.from, context) : smtpUser || '';
    const to = VariableInterpolator.interpolateString(data.to, context);
    const cc = data.cc ? VariableInterpolator.interpolateString(data.cc, context) : undefined;
    const bcc = data.bcc ? VariableInterpolator.interpolateString(data.bcc, context) : undefined;
    const subject = VariableInterpolator.interpolateString(data.subject, context);
    const body = data.body ? VariableInterpolator.interpolateString(data.body, context) : '';
    const bodyType = data.bodyType || 'text';
    const contextKey = data.contextKey || 'emailResult';

    if (traceLogsEnabled && traceLog) {
      traceLog(`[Email] Sending to: ${to}, subject: "${subject}" via ${smtpHost}:${smtpPort}`);
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: smtpUser ? { user: smtpUser, pass: smtpPass } : undefined,
    });

    const mailOptions: nodemailer.SendMailOptions = {
      from,
      to,
      cc,
      bcc,
      subject,
      ...(bodyType === 'html' ? { html: body } : { text: body }),
    };

    const startTime = Date.now();
    const info = await transporter.sendMail(mailOptions);
    const duration = Date.now() - startTime;

    const result = {
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
      response: info.response,
      duration,
      timestamp: Date.now(),
    };

    context.setData(contextKey, result);

    if (traceLogsEnabled && traceLog) {
      traceLog(`[Email] Sent successfully. MessageId: ${info.messageId}, Duration: ${duration}ms`);
    }
  }
}

export class SlackHandler implements NodeHandler {
  async execute(node: BaseNode, context: ContextManager): Promise<void> {
    const data = node.data as SlackNodeData;

    if (!data.webhookUrl) {
      throw new Error('Webhook URL is required for Slack node');
    }

    const traceLog = context.getData('traceLog') as ((message: string) => void) | undefined;
    const traceLogsEnabled = context.getData('traceLogs') as boolean | undefined;

    const webhookUrl = VariableInterpolator.interpolateString(data.webhookUrl, context);
    const message = data.message ? VariableInterpolator.interpolateString(data.message, context) : undefined;
    const channel = data.channel ? VariableInterpolator.interpolateString(data.channel, context) : undefined;
    const username = data.username ? VariableInterpolator.interpolateString(data.username, context) : undefined;
    const iconEmoji = data.iconEmoji ? VariableInterpolator.interpolateString(data.iconEmoji, context) : undefined;
    const contextKey = data.contextKey || 'slackResult';
    const timeout = data.timeout || 30000;

    let blocks: any[] | undefined;
    if (data.blocks) {
      try {
        const interpolatedBlocks = VariableInterpolator.interpolateString(data.blocks, context);
        blocks = JSON.parse(interpolatedBlocks);
      } catch (e) {
        throw new Error(`Invalid Slack blocks JSON: ${(e as Error).message}`);
      }
    }

    const payload: Record<string, any> = {};
    if (message) payload.text = message;
    if (channel) payload.channel = channel;
    if (username) payload.username = username;
    if (iconEmoji) payload.icon_emoji = iconEmoji;
    if (blocks) payload.blocks = blocks;

    if (!payload.text && !payload.blocks) {
      throw new Error('Either message or blocks must be provided for Slack node');
    }

    if (traceLogsEnabled && traceLog) {
      traceLog(`[Slack] Sending message to webhook${channel ? ` (channel: ${channel})` : ''}`);
    }

    const requestConfig: ApiRequestConfig = {
      method: 'POST',
      url: webhookUrl,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      bodyType: 'json',
      timeout,
    };

    const response = await HttpClient.executeRequest(requestConfig);

    const result = {
      status: response.status,
      statusText: response.statusText,
      body: response.body,
      duration: response.duration,
      timestamp: Date.now(),
    };

    context.setData(contextKey, result);

    if (traceLogsEnabled && traceLog) {
      traceLog(`[Slack] Message sent. Status: ${response.status}, Duration: ${response.duration}ms`);
    }
  }
}

export class WebhookHandler implements NodeHandler {
  async execute(node: BaseNode, context: ContextManager): Promise<void> {
    const data = node.data as WebhookNodeData;

    if (!data.url) {
      throw new Error('URL is required for Webhook node');
    }

    const traceLog = context.getData('traceLog') as ((message: string) => void) | undefined;
    const traceLogsEnabled = context.getData('traceLogs') as boolean | undefined;

    const url = VariableInterpolator.interpolateString(data.url, context);
    const method = (data.method || 'POST') as ApiRequestConfig['method'];
    const bodyType = data.bodyType || 'json';
    const contextKey = data.contextKey || 'webhookResult';
    const timeout = data.timeout || 30000;

    const interpolatedHeaders = data.headers
      ? VariableInterpolator.interpolateObject(data.headers, context) as Record<string, string>
      : undefined;
    const interpolatedBody = data.body
      ? VariableInterpolator.interpolateString(data.body, context)
      : undefined;

    if (traceLogsEnabled && traceLog) {
      traceLog(`[Webhook] ${method} ${url}`);
    }

    const requestConfig: ApiRequestConfig = {
      method,
      url,
      headers: interpolatedHeaders,
      body: interpolatedBody,
      bodyType,
      timeout,
    };

    let lastError: Error | null = null;
    const maxAttempts = data.retryEnabled ? (data.retryCount || 3) + 1 : 1;
    const retryDelay = data.retryDelay || 1000;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await HttpClient.executeRequest(requestConfig);

        const result = {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
          body: response.body,
          duration: response.duration,
          timestamp: Date.now(),
          attempt,
        };

        context.setData(contextKey, result);

        if (traceLogsEnabled && traceLog) {
          traceLog(`[Webhook] Response: ${response.status} ${response.statusText}, Duration: ${response.duration}ms`);
        }

        return;
      } catch (error) {
        lastError = error as Error;
        if (attempt < maxAttempts) {
          if (traceLogsEnabled && traceLog) {
            traceLog(`[Webhook] Attempt ${attempt} failed: ${lastError.message}. Retrying in ${retryDelay}ms...`);
          }
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }

    throw lastError || new Error('Webhook request failed');
  }
}
