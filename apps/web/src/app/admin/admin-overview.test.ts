import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { runInThisContext } from 'node:vm';
import { it } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import { MAX_ADMIN_MONEY, MAX_ADMIN_QUANTITY, parseAdminMoney, parseAdminQuantity } from '../../lib/admin-input.ts';

it('updates overview product, voucher and stock counts immediately after admin actions', async () => {
  const nodeRequire = createRequire(import.meta.url);
  const filename = fileURLToPath(new URL('./page.tsx', import.meta.url));
  const js = ts.transpileModule(readFileSync(filename, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } }).outputText;
  let tab = 'catalog';
  let index = 0;
  const overview = { stats: { totalOrders: 0, totalRevenue: 0, ordersByStatus: {}, activeProducts: 1, totalProducts: 1,
    activePromotions: 1, totalPromotions: 1, lowStockIngredients: 0, totalIngredients: 1 }, customers: [], recentOrders: [] };
  const state: unknown[] = [[], overview,
    [{ id: 'p', name: 'Coffee', description: '', active: true, price: 50000, version: 1, sizes: [{ size: 'S', price: 50000 }], recipeSummary: [] }], [],
    [{ id: 'i', name: 'Milk', stock: 3000, lowStock: false, version: 1, packageSize: 1000, packageLabel: 'box', unit: 'ML' }],
    [{ id: 'v', code: 'SALE10', active: true, version: 1, type: 'FIXED', value: 10, usedCount: 0, maxUses: null, startsAt: '2026-01-01', endsAt: '2030-01-01' }], false];
  const customRequire = (id: string): unknown => {
    if (id === 'react/jsx-runtime') return nodeRequire(id);
    if (id === 'react') return { ...React, useEffect() {},
      useSyncExternalStore: () => ({ id: 'admin', role: 'ADMIN' }),
      useState: (initial: unknown) => {
        const slot = index++;
        if (!(slot in state)) state[slot] = initial;
        return [state[slot], (value: unknown) => { state[slot] = typeof value === 'function' ? value(state[slot]) : value; }];
      } };
    if (id === 'next/link') return { __esModule: true, default: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => React.createElement('a', props) };
    if (id === 'next/navigation') return { useRouter: () => ({ push() {} }), useSearchParams: () => ({ get: () => tab }) };
    if (id === '@/lib/auth') return {};
    if (id === '@/lib/api') return { ApiRequestError: Error,
      apiPatch: async (path: string) => path.includes('/products/') ? { id: 'p', active: false, price: 50000, sizes: [{ size: 'S', price: 50000 }], version: 2 }
        : path.includes('/promotions/') ? { id: 'v', active: false, version: 2 }
        : { id: 'i', stock: 0, lowStock: true, version: 2 } };
    if (id === '@/components/OrderStatusBadge') return { __esModule: true, default: () => null };
    if (id === '@/lib/format') return { formatVnd: String };
    if (id === '@/lib/admin-input') return { MAX_ADMIN_MONEY, MAX_ADMIN_QUANTITY, parseAdminMoney, parseAdminQuantity };
    throw new Error(`Unexpected module: ${id}`);
  };
  const compiled = { exports: {} as { default: () => React.ReactElement<{ children: React.ReactElement }> } };
  const evaluate = runInThisContext(`(function(require,module,exports){${js}\n})`, { filename }) as
    (require: typeof customRequire, module: { exports: object }, exports: object) => void;
  evaluate(customRequire, compiled, compiled.exports);
  const content = compiled.exports.default().props.children.type as () => React.ReactElement;
  function render() { index = 0; return content(); }
  function findButton(node: React.ReactNode, text: string): (() => Promise<void>) | undefined {
    if (Array.isArray(node)) { for (const child of node) { const result = findButton(child, text); if (result) return result; } }
    if (!React.isValidElement<{ children?: React.ReactNode; onClick?: () => Promise<void> }>(node)) return;
    if (node.type === 'button' && node.props.children === text) return node.props.onClick;
    return findButton(node.props.children, text);
  }
  const deactivateProduct = findButton(render(), '⏸ Tạm ngưng bán');
  assert.ok(deactivateProduct); await deactivateProduct();
  tab = 'promotions';
  const deactivateVoucher = findButton(render(), '⏸ Tắt khuyến mãi');
  assert.ok(deactivateVoucher); await deactivateVoucher();
  tab = 'inventory';
  state[19] = { i: '0' }; // edited stock draft
  const saveStock = findButton(render(), 'Cập nhật');
  assert.ok(saveStock); await saveStock();
  tab = 'overview';
  const html = renderToStaticMarkup(render());
  assert.match(html, /0 \/ 1 món/);
  assert.match(html, /Khuyến mãi đang bật: 0\/1/);
  assert.match(html, /1 cảnh báo/);
  assert.equal(overview.stats.activeProducts, 1); // old API snapshot was not re-fetched or mutated
});
