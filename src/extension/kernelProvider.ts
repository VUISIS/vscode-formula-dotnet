import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { exists } from './util';
import { KernelProcess } from './kernelProcess';
import { spawn } from 'child_process';
import { Connection } from './connection';
import { Disposable } from 'vscode';

export interface IKernelSpec {
    id: string;
    location: string;
    locationType: LocationType;
    binary: string;
    argv: ReadonlyArray<string>;
    displayName: string;
    language: string;
    iconDataUri?: string;
}

export const enum LocationType {
    Global,
    User,
}
  
  
export interface IKernelSpecSearchPath {
    type: LocationType;
    path: string;
}

export interface IRunningKernel extends Disposable {
    connection: Connection;
    process: KernelProcess;
  }

export class KernelProvider
{
    public static defaultSearchPaths() {
        const searchPaths: IKernelSpecSearchPath[] = [];

        if (process.platform === 'win32') {
            searchPaths.push(
            { type: LocationType.User, path: `${process.env.APPDATA}\\jupyter\\kernels` },
            { type: LocationType.Global, path: `${process.env.PROGRAMDATA}\\jupyter\\kernels` },
            );
        } else {
            searchPaths.push(
            { type: LocationType.Global, path: '/usr/share/jupyter/kernels' },
            { type: LocationType.Global, path: '/usr/local/share/jupyter/kernels' },
            );
        }

        return searchPaths;
    }

    public getFormulaKernel() : IKernelSpec[] {
        const specs: IKernelSpec[] = [];
        for (const { path, type } of KernelProvider.defaultSearchPaths()) 
        {
          let kernels: string[];
          try {
            kernels = readdirSync(path);
          } catch {
            continue;
          }

          for(const kernel of kernels)
          {
              if(kernel === "formula")
              {
                const jsonPath = join(path, kernel, 'kernel.json');
                if (exists(jsonPath)) {
                    const rawSpec = JSON.parse(readFileSync(jsonPath, 'utf-8'));
                    const iconPath = join(path, kernel, 'logo-64x64.png');
                    specs.push({
                      id: [path, ...rawSpec.argv, rawSpec.language].join(' '),
                      location: path,
                      locationType: type,
                      binary: rawSpec.argv[0],
                      argv: rawSpec.argv.slice(1),
                      displayName: rawSpec.display_name,
                      language: rawSpec.language,
                      iconDataUri: (exists(iconPath))
                        ? `image/png;base64,${readFileSync(iconPath, 'base64')}`
                        : undefined,
                    });
                }
              }
          }
        }
    
        return specs;
      }

      public launchKernel(spec: IKernelSpec): IRunningKernel {
        const connection = Connection.create();
        const process = new KernelProcess(
          spawn(
            spec.binary,
            spec.argv.map(arg => arg.replace('{connection_file}', connection.connectionFile)),
            { stdio: 'pipe' },
          ),
        );
    
        return {
          connection,
          process,
          dispose: () => {
            connection.dispose();
            process.dispose();
          },
        };
      }
}