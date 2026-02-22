import { EmailHandler, SlackHandler, WebhookHandler } from '../notification';
import { NodeType } from '@automflows/shared';
import { createMockContextManager, createMockNode } from '../../__tests__/helpers/mocks';
import { VariableInterpolator } from '../../utils/variableInterpolator';
import { HttpClient } from '../../utils/httpClient';
import nodemailer from 'nodemailer';

jest.mock('../../utils/variableInterpolator');
jest.mock('../../utils/httpClient');
jest.mock('nodemailer');

const mockSendMail = jest.fn();
const mockCreateTransport = nodemailer.createTransport as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockCreateTransport.mockReturnValue({ sendMail: mockSendMail });
  (VariableInterpolator.interpolateString as jest.Mock).mockImplementation((str: string) => str);
  (VariableInterpolator.interpolateObject as jest.Mock).mockImplementation((obj: any) => obj);
});

// ---------------------------------------------------------------------------
// EmailHandler
// ---------------------------------------------------------------------------
describe('EmailHandler', () => {
  let handler: EmailHandler;
  let mockContext: any;

  beforeEach(() => {
    handler = new EmailHandler();
    mockContext = createMockContextManager();
    jest.spyOn(mockContext, 'setData');

    mockSendMail.mockResolvedValue({
      messageId: '<test-msg-id@example.com>',
      accepted: ['user@example.com'],
      rejected: [],
      response: '250 OK',
    });
  });

  it('should throw when smtpHost is missing', async () => {
    const node = createMockNode(NodeType.EMAIL, { to: 'a@b.com', subject: 'Hi' });
    await expect(handler.execute(node, mockContext)).rejects.toThrow('SMTP Host is required');
  });

  it('should throw when to is missing', async () => {
    const node = createMockNode(NodeType.EMAIL, { smtpHost: 'smtp.test.com', subject: 'Hi' });
    await expect(handler.execute(node, mockContext)).rejects.toThrow('Recipient (To) is required');
  });

  it('should throw when subject is missing', async () => {
    const node = createMockNode(NodeType.EMAIL, { smtpHost: 'smtp.test.com', to: 'a@b.com' });
    await expect(handler.execute(node, mockContext)).rejects.toThrow('Subject is required');
  });

  it('should send a plain-text email and store result in context', async () => {
    const node = createMockNode(NodeType.EMAIL, {
      smtpHost: 'smtp.test.com',
      smtpPort: 587,
      smtpUser: 'user@test.com',
      smtpPass: 'pass',
      from: 'sender@test.com',
      to: 'recipient@test.com',
      subject: 'Test Subject',
      body: 'Hello World',
      bodyType: 'text',
      contextKey: 'mailResult',
    });

    await handler.execute(node, mockContext);

    expect(mockCreateTransport).toHaveBeenCalledWith({
      host: 'smtp.test.com',
      port: 587,
      secure: false,
      auth: { user: 'user@test.com', pass: 'pass' },
    });

    expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({
      from: 'sender@test.com',
      to: 'recipient@test.com',
      subject: 'Test Subject',
      text: 'Hello World',
    }));

    expect(mockContext.setData).toHaveBeenCalledWith('mailResult', expect.objectContaining({
      messageId: '<test-msg-id@example.com>',
      accepted: ['user@example.com'],
      rejected: [],
    }));
  });

  it('should send an HTML email when bodyType is html', async () => {
    const node = createMockNode(NodeType.EMAIL, {
      smtpHost: 'smtp.test.com',
      to: 'recipient@test.com',
      subject: 'HTML Test',
      body: '<h1>Hello</h1>',
      bodyType: 'html',
    });

    await handler.execute(node, mockContext);

    expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({
      html: '<h1>Hello</h1>',
    }));
    expect(mockSendMail).toHaveBeenCalledWith(expect.not.objectContaining({ text: expect.anything() }));
  });

  it('should default contextKey to emailResult', async () => {
    const node = createMockNode(NodeType.EMAIL, {
      smtpHost: 'smtp.test.com',
      to: 'a@b.com',
      subject: 'S',
    });

    await handler.execute(node, mockContext);
    expect(mockContext.setData).toHaveBeenCalledWith('emailResult', expect.any(Object));
  });

  it('should skip auth when smtpUser is not provided', async () => {
    const node = createMockNode(NodeType.EMAIL, {
      smtpHost: 'smtp.test.com',
      to: 'a@b.com',
      subject: 'S',
    });

    await handler.execute(node, mockContext);

    expect(mockCreateTransport).toHaveBeenCalledWith(expect.objectContaining({
      auth: undefined,
    }));
  });

  it('should pass cc and bcc when provided', async () => {
    const node = createMockNode(NodeType.EMAIL, {
      smtpHost: 'smtp.test.com',
      to: 'a@b.com',
      cc: 'cc@b.com',
      bcc: 'bcc@b.com',
      subject: 'S',
    });

    await handler.execute(node, mockContext);

    expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({
      cc: 'cc@b.com',
      bcc: 'bcc@b.com',
    }));
  });

  it('should interpolate variables in fields', async () => {
    (VariableInterpolator.interpolateString as jest.Mock).mockImplementation((str: string) => {
      if (str === '${data.host}') return 'smtp.interpolated.com';
      if (str === '${data.recipient}') return 'interp@test.com';
      return str;
    });

    const node = createMockNode(NodeType.EMAIL, {
      smtpHost: '${data.host}',
      to: '${data.recipient}',
      subject: 'Test',
    });

    await handler.execute(node, mockContext);

    expect(mockCreateTransport).toHaveBeenCalledWith(expect.objectContaining({
      host: 'smtp.interpolated.com',
    }));
    expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'interp@test.com',
    }));
  });
});

// ---------------------------------------------------------------------------
// SlackHandler
// ---------------------------------------------------------------------------
describe('SlackHandler', () => {
  let handler: SlackHandler;
  let mockContext: any;

  beforeEach(() => {
    handler = new SlackHandler();
    mockContext = createMockContextManager();
    jest.spyOn(mockContext, 'setData');

    (HttpClient.executeRequest as jest.Mock).mockResolvedValue({
      status: 200,
      statusText: 'OK',
      body: 'ok',
      headers: {},
      duration: 150,
      timestamp: Date.now(),
    });
  });

  it('should throw when webhookUrl is missing', async () => {
    const node = createMockNode(NodeType.SLACK, { message: 'hi' });
    await expect(handler.execute(node, mockContext)).rejects.toThrow('Webhook URL is required');
  });

  it('should throw when neither message nor blocks are provided', async () => {
    const node = createMockNode(NodeType.SLACK, {
      webhookUrl: 'https://hooks.slack.com/services/T/B/X',
    });
    await expect(handler.execute(node, mockContext)).rejects.toThrow(
      'Either message or blocks must be provided'
    );
  });

  it('should send a simple text message', async () => {
    const node = createMockNode(NodeType.SLACK, {
      webhookUrl: 'https://hooks.slack.com/services/T/B/X',
      message: 'Hello Slack!',
    });

    await handler.execute(node, mockContext);

    expect(HttpClient.executeRequest).toHaveBeenCalledWith(expect.objectContaining({
      method: 'POST',
      url: 'https://hooks.slack.com/services/T/B/X',
      body: JSON.stringify({ text: 'Hello Slack!' }),
    }));
  });

  it('should include optional channel, username, and iconEmoji', async () => {
    const node = createMockNode(NodeType.SLACK, {
      webhookUrl: 'https://hooks.slack.com/services/T/B/X',
      message: 'Hello',
      channel: '#alerts',
      username: 'Bot',
      iconEmoji: ':robot_face:',
    });

    await handler.execute(node, mockContext);

    const calls = (HttpClient.executeRequest as jest.Mock).mock.calls;
    const callBody = JSON.parse(calls[calls.length - 1][0].body);
    expect(callBody.text).toBe('Hello');
    expect(callBody.channel).toBe('#alerts');
    expect(callBody.username).toBe('Bot');
    expect(callBody.icon_emoji).toBe(':robot_face:');
  });

  it('should send blocks when provided', async () => {
    const blocks = [{ type: 'section', text: { type: 'mrkdwn', text: '*Test*' } }];
    const node = createMockNode(NodeType.SLACK, {
      webhookUrl: 'https://hooks.slack.com/services/T/B/X',
      message: 'With blocks',
      blocks: JSON.stringify(blocks),
    });

    await handler.execute(node, mockContext);

    const calls = (HttpClient.executeRequest as jest.Mock).mock.calls;
    const callBody = JSON.parse(calls[calls.length - 1][0].body);
    expect(callBody.blocks).toEqual(blocks);
  });

  it('should throw on invalid blocks JSON', async () => {
    const node = createMockNode(NodeType.SLACK, {
      webhookUrl: 'https://hooks.slack.com/services/T/B/X',
      blocks: 'not valid json {{{',
    });

    await expect(handler.execute(node, mockContext)).rejects.toThrow('Invalid Slack blocks JSON');
  });

  it('should store result in context with default key', async () => {
    const node = createMockNode(NodeType.SLACK, {
      webhookUrl: 'https://hooks.slack.com/services/T/B/X',
      message: 'Hi',
    });

    await handler.execute(node, mockContext);

    expect(mockContext.setData).toHaveBeenCalledWith('slackResult', expect.objectContaining({
      status: 200,
      statusText: 'OK',
    }));
  });

  it('should store result in custom contextKey', async () => {
    const node = createMockNode(NodeType.SLACK, {
      webhookUrl: 'https://hooks.slack.com/services/T/B/X',
      message: 'Hi',
      contextKey: 'mySlack',
    });

    await handler.execute(node, mockContext);
    expect(mockContext.setData).toHaveBeenCalledWith('mySlack', expect.any(Object));
  });
});

// ---------------------------------------------------------------------------
// WebhookHandler
// ---------------------------------------------------------------------------
describe('WebhookHandler', () => {
  let handler: WebhookHandler;
  let mockContext: any;
  const mockResponse = {
    status: 200,
    statusText: 'OK',
    body: { success: true },
    headers: { 'content-type': 'application/json' },
    duration: 120,
    timestamp: Date.now(),
  };

  beforeEach(() => {
    handler = new WebhookHandler();
    mockContext = createMockContextManager();
    jest.spyOn(mockContext, 'setData');
    (HttpClient.executeRequest as jest.Mock).mockResolvedValue(mockResponse);
  });

  it('should throw when url is missing', async () => {
    const node = createMockNode(NodeType.WEBHOOK, {});
    await expect(handler.execute(node, mockContext)).rejects.toThrow('URL is required');
  });

  it('should send a POST request by default', async () => {
    const node = createMockNode(NodeType.WEBHOOK, {
      url: 'https://example.com/hook',
      body: '{"event":"done"}',
    });

    await handler.execute(node, mockContext);

    expect(HttpClient.executeRequest).toHaveBeenCalledWith(expect.objectContaining({
      method: 'POST',
      url: 'https://example.com/hook',
      body: '{"event":"done"}',
      bodyType: 'json',
    }));
  });

  it('should use the specified HTTP method', async () => {
    const node = createMockNode(NodeType.WEBHOOK, {
      url: 'https://example.com/hook',
      method: 'PUT',
    });

    await handler.execute(node, mockContext);

    expect(HttpClient.executeRequest).toHaveBeenCalledWith(expect.objectContaining({
      method: 'PUT',
    }));
  });

  it('should interpolate headers', async () => {
    const headers = { Authorization: 'Bearer ${data.token}' };
    (VariableInterpolator.interpolateObject as jest.Mock).mockReturnValue({
      Authorization: 'Bearer abc123',
    });

    const node = createMockNode(NodeType.WEBHOOK, {
      url: 'https://example.com/hook',
      headers,
    });

    await handler.execute(node, mockContext);

    expect(HttpClient.executeRequest).toHaveBeenCalledWith(expect.objectContaining({
      headers: { Authorization: 'Bearer abc123' },
    }));
  });

  it('should store result in context with default key', async () => {
    const node = createMockNode(NodeType.WEBHOOK, {
      url: 'https://example.com/hook',
    });

    await handler.execute(node, mockContext);

    expect(mockContext.setData).toHaveBeenCalledWith('webhookResult', expect.objectContaining({
      status: 200,
      attempt: 1,
    }));
  });

  it('should store result in custom contextKey', async () => {
    const node = createMockNode(NodeType.WEBHOOK, {
      url: 'https://example.com/hook',
      contextKey: 'myWebhook',
    });

    await handler.execute(node, mockContext);
    expect(mockContext.setData).toHaveBeenCalledWith('myWebhook', expect.any(Object));
  });

  it('should retry on failure when retryEnabled is true', async () => {
    (HttpClient.executeRequest as jest.Mock)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(mockResponse);

    const node = createMockNode(NodeType.WEBHOOK, {
      url: 'https://example.com/hook',
      retryEnabled: true,
      retryCount: 2,
      retryDelay: 10,
    });

    await handler.execute(node, mockContext);

    expect(HttpClient.executeRequest).toHaveBeenCalledTimes(2);
    expect(mockContext.setData).toHaveBeenCalledWith('webhookResult', expect.objectContaining({
      attempt: 2,
    }));
  });

  it('should throw after exhausting all retries', async () => {
    (HttpClient.executeRequest as jest.Mock).mockRejectedValue(new Error('Network error'));

    const node = createMockNode(NodeType.WEBHOOK, {
      url: 'https://example.com/hook',
      retryEnabled: true,
      retryCount: 1,
      retryDelay: 10,
    });

    await expect(handler.execute(node, mockContext)).rejects.toThrow('Network error');
    // 1 initial + 1 retry = 2 attempts
    expect(HttpClient.executeRequest).toHaveBeenCalledTimes(2);
  });

  it('should not retry when retryEnabled is false', async () => {
    (HttpClient.executeRequest as jest.Mock).mockRejectedValue(new Error('Fail'));

    const node = createMockNode(NodeType.WEBHOOK, {
      url: 'https://example.com/hook',
      retryEnabled: false,
    });

    await expect(handler.execute(node, mockContext)).rejects.toThrow('Fail');
    expect(HttpClient.executeRequest).toHaveBeenCalledTimes(1);
  });

  it('should use custom timeout', async () => {
    const node = createMockNode(NodeType.WEBHOOK, {
      url: 'https://example.com/hook',
      timeout: 5000,
    });

    await handler.execute(node, mockContext);

    expect(HttpClient.executeRequest).toHaveBeenCalledWith(expect.objectContaining({
      timeout: 5000,
    }));
  });
});
