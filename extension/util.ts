import * as fs from 'fs';

type ResolvedMap<T> = { [K in keyof T]: T[K] extends PromiseLike<infer U> ? U : T[K] };

export const promiseMap = <T extends { [key: string]: unknown }>(
  obj: T,
): ResolvedMap<T> => {
  const out: Partial<ResolvedMap<T>> = {};
  Object.keys(obj).map(key => ((out as { [key: string]: unknown })[key] = obj[key]));
  return out as ResolvedMap<T>;
};

export const exists = (path: string) => {
  try {
    fs.statSync(path);
    return true;
  } catch {
    return false;
  }
};

export async function sleep(ms: number) : Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}