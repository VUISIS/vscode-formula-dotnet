/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import { ChildProcessWithoutNullStreams } from 'child_process';
import { ReplaySubject, Subject } from 'rxjs';
import split from 'split2';
import { Disposable } from 'vscode';

export class KernelProcess implements Disposable {
  public readonly stdout = new Subject<string>();
  public readonly stderr = new Subject<string>();
  public readonly exit = new ReplaySubject<Error | undefined>(1);

  private killed = false;

  constructor(private readonly cp: ChildProcessWithoutNullStreams) {
    cp.stderr.pipe(split()).on('data', line => this.stderr.next(line));
    cp.stdout.pipe(split()).on('data', line => this.stderr.next(line));
    cp.on('error', err => this.exit.next(err));
    cp.on('exit', code =>
      this.exit.next(
        code && !this.killed ? new Error(`Kernel exited with code ${code}`) : undefined,
      ),
    );
  }

  public connectToProcessStdio() {
    this.stderr.subscribe(line => process.stderr.write(`kernel stderr> ${line}\n`));
    this.stdout.subscribe(line => process.stdout.write(`kernel stdout> ${line}\n`));
    this.exit.subscribe(err => (err ? console.error(err.stack) : `Kernel exited gracefully`));
  }

  public dispose() {
    this.killed = true;
    this.cp.kill('SIGINT');
  }
}
