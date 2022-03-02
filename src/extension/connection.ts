import * as zmq from 'zeromq';
import { MessageType as OriginalMessageType } from '@nteract/messaging';
import { TypedJupyerMessage } from './messaging';
import * as wireProtocol from '@nteract/messaging/lib/wire-protocol';
import * as fs from 'fs';
import { Subject, Observable, from } from 'rxjs';
import { ignoreElements, concatWith, filter } from 'rxjs/operators';
import * as crypto from 'crypto';
import { promiseMap } from './util';
import { join } from 'path';
import { tmpdir } from 'os'; 
import { JupyterMessageHeader } from './messaging';
import * as vscode from 'vscode';
import { Disposable } from 'vscode';

const ch = vscode.window.createOutputChannel("Connection");

interface ISockets {
    key: string;
    signatureScheme: string;
    heartbeat: { port: number; socket: zmq.Push };
    control: { port: number; socket: zmq.Dealer };
    shell: { port: number; socket: zmq.Dealer };
    stdin: { port: number; socket: zmq.Dealer };
    iopub: { port: number; socket: zmq.Subscriber };
}

type SendChannel = 'control' | 'shell' | 'stdin';
type ReceiveChannel = 'control' | 'shell' | 'stdin' | 'iopub';

export type IOChannel = SendChannel | ReceiveChannel;

const fromRawMessage = <MT extends OriginalMessageType, C = unknown>(
    channel: IOChannel,
    rawMessage: wireProtocol.RawJupyterMessage<MT, C>,
  ): TypedJupyerMessage =>
(({
    ...rawMessage,
    channel,
    buffers: rawMessage.buffers ? Buffer.concat(rawMessage.buffers) : undefined,
} as unknown) as TypedJupyerMessage);

const toRawMessage = (rawMessage: TypedJupyerMessage): wireProtocol.RawJupyterMessage => {
    const rawBuffer = rawMessage.buffers;
    const arrBuffer = rawBuffer as ArrayBuffer[];
    const bufferArr = [];
    for(const ab of arrBuffer)
    {
        const buffer = Buffer.from(ab);
        bufferArr.push(buffer);

    }
    return {
        ...rawMessage,
        header: rawMessage.header as JupyterMessageHeader<never>,
        parent_header: rawMessage.parent_header as JupyterMessageHeader<OriginalMessageType>,
        buffers: rawMessage.buffers ? bufferArr : [],
        idents: [],
    };
};

export class Connection implements Disposable {
    public readonly messages = new Subject<TypedJupyerMessage>();
    
    public static create() {
        //const routingId = crypto.randomBytes(8).toString('hex');
        const sockets: ISockets = promiseMap({
            key: crypto.randomBytes(32).toString('hex'),
            signatureScheme: 'hmac-sha256',
            control: createSocket(new zmq.Dealer()),
            heartbeat: createSocket(new zmq.Push()),
            iopub: createSocket(new zmq.Subscriber()),
            shell: createSocket(new zmq.Dealer()),
            stdin: createSocket(new zmq.Dealer()),
        });
        
        const cnx = new Connection(sockets, createConnectionFile(sockets));
        cnx.processSocketMessages('control', sockets.control.socket);
        cnx.processSocketMessages('iopub', sockets.iopub.socket);
        cnx.processSocketMessages('shell', sockets.shell.socket);
        cnx.processSocketMessages('stdin', sockets.stdin.socket);
        return cnx;
    }
    
    protected constructor(
        private readonly sockets: ISockets,
        public readonly connectionFile: string,
    ) {
    }
    
    private async processSocketMessages(
        channel: ReceiveChannel,
        socket: zmq.Dealer | zmq.Subscriber,
    ) {
        const msg = await socket.receive();
        ch.appendLine(msg.toString());
        const message = wireProtocol.decode(msg, this.sockets.key, this.sockets.signatureScheme);
        this.messages.next(fromRawMessage(channel, message));
    }
    
    public sendRaw(message: TypedJupyerMessage) {
        const data = wireProtocol.encode(
        toRawMessage(message),
        this.sockets.key,
        this.sockets.signatureScheme,
        );
        return this.sockets[message.channel as SendChannel].socket.send(data);
    }

    public sendAndReceive(message: TypedJupyerMessage): Observable<TypedJupyerMessage> {
        return from(this.sendRaw(message)).pipe(
          ignoreElements(),
          concatWith(this.messages),
          filter(msg => msg.parent_header?.msg_id === message.header.msg_id),
        );
    }
    
    public dispose() {
        this.sockets.control.socket.close();
        this.sockets.heartbeat.socket.close();
        this.sockets.iopub.socket.close();
        this.sockets.shell.socket.close();
        this.sockets.stdin.socket.close();
        fs.unlinkSync(this.connectionFile);
    }
}

function createConnectionFile(sockets: ISockets, host = '127.0.0.1'): string {
    const contents = JSON.stringify({
      control_port: sockets.control.port,
      shell_port: sockets.shell.port,
      hb_port: sockets.heartbeat.port,
      stdin_port: sockets.stdin.port,
      iopub_port: sockets.iopub.port,
      transport: 'tcp',
      ip: host,
      signature_scheme: sockets.signatureScheme,
      key: sockets.key,
    });

    ch.appendLine(sockets.control.port.toString());
  
    const fname = join(tmpdir(), `formula-${crypto.randomBytes(8).toString('hex')}.json`);
    fs.writeFileSync(fname, contents);
    return fname;
  }

function createSocket<T extends zmq.Socket>(socket: T): { socket: T; port: number } {
    const port = getRandomPort();
    socket.connect(`tcp://127.0.0.1:${port}`);
    return { port, socket };
}

function getRandomPort(min = 49152, max = 65536) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}