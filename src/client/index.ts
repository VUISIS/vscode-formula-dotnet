import { render } from './render';
import errorOverlay from 'vscode-notebook-error-overlay';
import type { ActivationFunction } from 'vscode-notebook-renderer';

declare let webPackVariableEntryPoint: string;
declare const scriptUrl: string;

webPackVariableEntryPoint = new URL(scriptUrl.replace(/[^/]+$/, '') + webPackVariableEntryPoint).toString();

export const activate: ActivationFunction = context => {
  return {
    renderOutputItem(outputItem, element) {
      let shadow = element.shadowRoot;
      if (!shadow) {
        shadow = element.attachShadow({ mode: 'open' });
        const root = document.createElement('div');
        root.id = 'root';
        shadow.append(root);
      }
      const root = shadow.querySelector<HTMLElement>('#root')!;
      errorOverlay.wrap(root, () => {
        root.innerHTML = '';
        const node = document.createElement('div');
        root.appendChild(node);

        render({ container: node, mime: outputItem.mime, value: outputItem.json(), context });
      });
    },
    disposeOutputItem(outputId) {
    }
  };
};
