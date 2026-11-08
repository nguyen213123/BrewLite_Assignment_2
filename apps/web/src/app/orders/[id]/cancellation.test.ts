import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { runInThisContext } from 'node:vm';
import { it } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

it('shows cancellation success only when the cancel API actually returns CANCELLED', async () => {
  const nodeRequire = createRequire(import.meta.url);
  const filename = fileURLToPath(new URL('./page.tsx', import.meta.url));
  const js = ts.transpileModule(readFileSync(filename, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } }).outputText;
  for (const status of ['CANCELLED', 'PREPARING', 'READY', 'COMPLETED']) {
    const original = { id: 'order', code: 'BL-TEST', status: 'PAID', reservationStatus: 'CONSUMED', version: 1,
      total: 50000, subtotal: 50000, discount: 0, items: [], createdAt: '', updatedAt: '' };
    const state: unknown[] = [original, false, null, null, false, true, false, 0];
    let index = 0;
    const customRequire = (id: string): unknown => {
      if (id === 'react/jsx-runtime') return nodeRequire(id);
      if (id === 'react') return { ...React, use: () => ({ id: 'order' }), useEffect() {},
        useSyncExternalStore: () => ({ id: 'user', role: 'CUSTOMER' }),
        useState: () => {
          const slot = index++;
          return [state[slot], (value: unknown) => { state[slot] = value; }];
        } };
      if (id === 'next/link') return { __esModule: true, default: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => React.createElement('a', props) };
      if (id === '@/lib/auth') return { updateUserPoints() {} };
      if (id === '@/lib/api') return { apiFetch: async () => ({ ...original, status }), apiGet: async () => ({ points: 0 }), ApiRequestError: Error };
      if (id === '@/components/OrderStatusBadge') return { __esModule: true, default: () => null };
      if (id === '@/lib/format') return { formatVnd: String };
      throw new Error(`Unexpected module: ${id}`);
    };
    const compiled = { exports: {} as { default: (props: unknown) => React.ReactElement } };
    const evaluate = runInThisContext(`(function(require,module,exports){${js}\n})`, { filename }) as
      (require: typeof customRequire, module: { exports: object }, exports: object) => void;
    evaluate(customRequire, compiled, compiled.exports);
    function render() { index = 0; return compiled.exports.default({ params: Promise.resolve({ id: 'order' }) }); }
    function findCancel(node: React.ReactNode): (() => Promise<void>) | undefined {
      if (Array.isArray(node)) {
        for (const child of node) { const match = findCancel(child); if (match) return match; }
      }
      if (!React.isValidElement<{ children?: React.ReactNode; onClick?: () => Promise<void> }>(node)) return;
      if (node.type === 'button' && node.props.children === 'Đồng ý hủy đơn') return node.props.onClick;
      return findCancel(node.props.children);
    }
    const cancel = findCancel(render());
    assert.ok(cancel);
    await cancel();
    const html = renderToStaticMarkup(render());
    if (status === 'CANCELLED') {
      assert.match(html, /Đơn hàng đã được hủy thành công/);
    } else {
      assert.doesNotMatch(html, /Đơn hàng đã được hủy thành công/);
      assert.match(html, /Đơn chưa được hủy và chưa hoàn kho/);
    }
  }
});
