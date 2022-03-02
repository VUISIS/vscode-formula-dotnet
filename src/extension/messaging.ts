import * as nteract from '@nteract/messaging';
import { IOChannel } from './connection';
import { randomBytes } from 'crypto';

export type MessageType = nteract.MessageType;

export type JupyterMessageHeader<MT extends MessageType> = Omit<nteract.JupyterMessageHeader,'msg_type'> & {
  msg_type: MT;
};

export type JupyterMessage<MT extends MessageType = MessageType, C = unknown, Channel = IOChannel> = Omit<nteract.JupyterMessage<never, C>, 'header' | 'channel'> & {
  header: JupyterMessageHeader<MT>;
  channel: Channel;
};

export type KernelInfoRequest = JupyterMessage<
  'kernel_info_request',
  {

  },
  'shell'
>;

export type InputReply = JupyterMessage<
  'input_reply',
  {
    value: string
  },
  'stdin'
>;

export type ExecuteRequest = JupyterMessage<
  'execute_request',
  {
    code: string;
    silent: boolean;
    store_history: boolean;
    user_expressions: { [key: string]: string };
    allow_stdin: boolean;
    stop_on_error: boolean;
  },
  'shell'
>;

export type ExecuteReply = JupyterMessage<
  'execute_reply',
  {
    status: string;
    execution_count: number;
  },
  'shell'
>;

export type ExecuteResult = JupyterMessage<
  'execute_result',
  {
    data: { [mimeType: string]: string };
    metadata: { [key: string]: unknown };
  },
  'iopub'
>;

export type DisplayData = JupyterMessage<
  'display_data',
  {
    data: { [mimeType: string]: string };
    metadata: { [key: string]: unknown };
    transient: { [key: string]: unknown };
  },
  'iopub'
>;

export type StreamOutput = JupyterMessage<
  'stream',
  {
    stream: 'stdout' | 'stderr';
    text: string;
  },
  'iopub'
>;

export type ExecutionError = JupyterMessage<
  'error',
  {
    ename: string;
    evalue: string;
    traceback: string[];
  },
  'iopub'
>;

export type TypedJupyerMessage =
  | ExecuteRequest
  | ExecuteReply
  | ExecuteResult
  | KernelInfoRequest
  | InputReply
  | DisplayData
  | ExecutionError
  | StreamOutput;

export const isMessageType = <T extends MessageType>(
  messageType: T,
  test: TypedJupyerMessage,
): test is TypedJupyerMessage & JupyterMessage<T> => test.header.msg_type === messageType;

const createHeader = <MT extends MessageType>(messageType: MT): JupyterMessageHeader<MT> => ({
    msg_id: randomBytes(8).toString('hex'),
    date: new Date().toISOString(),
    version: '5.2',
    msg_type: messageType,
    username: 'vscode',
    session: randomBytes(8).toString('hex'),
});

export const executeRequest = (
  code: string,
  options: {
    silent?: boolean;
    storeHistory?: boolean;
    userExpressions?: { [key: string]: string };
    allowStdin?: boolean;
    stopOnError?: boolean;
  } = {},
): ExecuteRequest => ({
  channel: 'shell',
  header: createHeader('execute_request'),
  metadata: {},
  parent_header: {},
  content: {
    code,
    silent: options.silent ?? false,
    store_history: options.storeHistory ?? true,
    user_expressions: options.userExpressions ?? {},
    allow_stdin: options.allowStdin ?? true,
    stop_on_error: options.stopOnError ?? false,
  },
  buffers: [new ArrayBuffer(0)],
});

export const kernelInfoRequest = (): KernelInfoRequest => ({
  channel: 'shell',
  header: createHeader('kernel_info_request'),
  metadata: {},
  parent_header: {},
  content: {
  },
  buffers: [new ArrayBuffer(0)],
});

export const inputReply = (val: string): InputReply => ({
  channel: 'stdin',
  header: createHeader('input_reply'),
  metadata: {},
  parent_header: {},
  content: {
    value: val
  },
  buffers: [new ArrayBuffer(0)],
});