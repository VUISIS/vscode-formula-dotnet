import * as style from './style.css';
import type { RendererContext } from 'vscode-notebook-renderer';

interface IRenderInfo {
  container: HTMLElement;
  mime: string;
  value: any;
  context: RendererContext<unknown>;
}

export function render({ container, mime, value }: IRenderInfo) {
  const pre = document.createElement('pre');
  pre.classList.add(style.json);
  console.log(pre.classList);
  const code = document.createElement('code');
  code.className = 'output';
  code.textContent = `mime type: ${mime}\n\n${JSON.stringify(value, null, 2)}`;
  pre.appendChild(code);
  container.appendChild(pre);
}

if (module.hot) {
  module.hot.addDisposeHandler(() => {
  });
}
