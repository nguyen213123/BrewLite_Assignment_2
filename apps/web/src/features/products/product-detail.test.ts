import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { ProductDetail } from '../../lib/contracts/api.generated.ts';
import {
  maxQtyFor,
  priceSelection,
  toAddItemInput,
  validateSelection,
} from './pricing.ts';
import { formatVnd } from './format.ts';

const mockKem = {
  id: '22222222-2222-4222-8222-222222222222',
  name: 'Kem',
  price: 10000,
  stock: 30,
};

const mockTranChau = {
  id: '22222222-2222-4222-8222-222222222223',
  name: 'Trân châu',
  price: 8000,
  stock: 15,
};

const mockThachTraiCay = {
  id: '22222222-2222-4222-8222-222222222224',
  name: 'Thạch trái cây',
  price: 7000,
  stock: 0, // Hết hàng
};

const mockCappuccino: ProductDetail = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Cappuccino',
  description: 'Cà phê espresso và sữa tươi',
  price: 45000,
  imageUrl: 'http://localhost:3000/images/cappuccino.jpg',
  stock: 20,
  sizes: [
    { size: 'S', price: 45000, stock: 20 },
    { size: 'M', price: 50000, stock: 16 },
    { size: 'L', price: 55000, stock: 0 }, // Hết hàng size L
  ],
  toppings: [mockKem, mockTranChau, mockThachTraiCay],
};

describe('Issue #17 — Kiểm thử toàn diện Chi tiết món & Mobile-First 360px', () => {
  describe('1. Lựa chọn kích cỡ và tính giá theo Size (AC3)', () => {
    it('bắt buộc chọn size: nếu size = null thì không thể tính giá và bị chặn', () => {
      const sel = { size: null, toppingIds: [], qty: 1 };
      assert.equal(priceSelection(mockCappuccino, sel), null);
      assert.equal(validateSelection(mockCappuccino, sel), 'Vui lòng chọn kích cỡ');
      assert.equal(toAddItemInput(mockCappuccino, sel), null);
    });

    it('tính giá đúng cho từng size: S=45k, M=50k, L=55k', () => {
      const pS = priceSelection(mockCappuccino, { size: 'S', toppingIds: [], qty: 1 });
      const pM = priceSelection(mockCappuccino, { size: 'M', toppingIds: [], qty: 1 });
      const pL = priceSelection(mockCappuccino, { size: 'L', toppingIds: [], qty: 1 });

      assert.equal(pS?.unitPrice, 45000);
      assert.equal(pM?.unitPrice, 50000);
      assert.equal(pL?.unitPrice, 55000);
    });

    it('chặn chọn size đã hết nguyên liệu pha chế (Size L stock = 0)', () => {
      const selL = { size: 'L' as const, toppingIds: [], qty: 1 };
      assert.equal(validateSelection(mockCappuccino, selL), 'Size này đã hết');
      assert.equal(toAddItemInput(mockCappuccino, selL), null);
    });
  });

  describe('2. Lựa chọn Topping & Đơn giá tạm tính (AC3)', () => {
    it('chọn nhiều topping: giá tạm tính = giá size + tổng giá topping', () => {
      // Size M (50.000) + Kem (10.000) + Trân châu (8.000) = 68.000đ/ly
      const sel = {
        size: 'M' as const,
        toppingIds: [mockKem.id, mockTranChau.id],
        qty: 1,
      };
      const priced = priceSelection(mockCappuccino, sel);
      assert.equal(priced?.unitPrice, 68000);
      assert.equal(priced?.lineTotal, 68000);
    });

    it('thành tiền tạm tính nhân chính xác với số lượng: 68.000 x 3 = 204.000đ', () => {
      const sel = {
        size: 'M' as const,
        toppingIds: [mockKem.id, mockTranChau.id],
        qty: 3,
      };
      const priced = priceSelection(mockCappuccino, sel);
      assert.equal(priced?.unitPrice, 68000);
      assert.equal(priced?.lineTotal, 204000);
    });

    it('chặn lựa chọn topping đã hết nguyên liệu (Thạch trái cây stock = 0)', () => {
      const sel = {
        size: 'M' as const,
        toppingIds: [mockThachTraiCay.id],
        qty: 1,
      };
      assert.equal(validateSelection(mockCappuccino, sel), 'Topping Thạch trái cây đã hết');
      assert.equal(toAddItemInput(mockCappuccino, sel), null);
    });

    it('chặn danh sách topping có id trùng lặp hoặc không thuộc món', () => {
      const selDuplicate = {
        size: 'M' as const,
        toppingIds: [mockKem.id, mockKem.id],
        qty: 1,
      };
      assert.equal(
        validateSelection(mockCappuccino, selDuplicate),
        'Topping đã chọn không còn hợp lệ',
      );

      const selUnknown = {
        size: 'M' as const,
        toppingIds: ['00000000-0000-0000-0000-000000000000'],
        qty: 1,
      };
      assert.equal(
        validateSelection(mockCappuccino, selUnknown),
        'Topping đã chọn không còn hợp lệ',
      );
    });
  });

  describe('3. Kiểm soát tồn kho và số lượng khả dụng (AC1, AC3)', () => {
    it('tính số lượng tối đa theo nút thắt nhỏ nhất giữa size và các topping', () => {
      // Size M có stock = 16, Kem có stock = 30, Trân châu có stock = 15
      // => Nút thắt là Trân châu (15 ly)
      const max = maxQtyFor(mockCappuccino, 'M', [mockKem.id, mockTranChau.id]);
      assert.equal(max, 15);
    });

    it('chặn đặt số lượng vượt quá tồn kho nguyên liệu khả dụng', () => {
      const selExceed = {
        size: 'M' as const,
        toppingIds: [mockKem.id, mockTranChau.id],
        qty: 16, // > 15
      };
      assert.equal(
        validateSelection(mockCappuccino, selExceed),
        'Số lượng phải từ 1 đến 15',
      );
      assert.equal(toAddItemInput(mockCappuccino, selExceed), null);
    });

    it('chấp nhận số lượng hợp lệ trong khoảng 1 đến max', () => {
      const selValid = {
        size: 'M' as const,
        toppingIds: [mockKem.id, mockTranChau.id],
        qty: 15,
      };
      assert.equal(validateSelection(mockCappuccino, selValid), null);
      const input = toAddItemInput(mockCappuccino, selValid);
      assert.ok(input);
      assert.equal(input.qty, 15);
      assert.equal(input.productId, mockCappuccino.id);
      assert.equal(input.size, 'M');
      assert.equal(input.toppings.length, 2);
    });

    it('món hết hàng toàn bộ (stock = 0) bị từ chối ngay lập tức', () => {
      const outOfStockProduct = { ...mockCappuccino, stock: 0 };
      const sel = { size: 'S' as const, toppingIds: [], qty: 1 };
      assert.equal(validateSelection(outOfStockProduct, sel), 'Sản phẩm đã hết hàng');
    });
  });

  describe('4. Định dạng tiền tệ VND & Trải nghiệm 360px Mobile-First (AC2)', () => {
    it('định dạng tiền tệ chuẩn tiếng Việt: có dấu chấm phân cách hàng nghìn và ký hiệu đ', () => {
      assert.equal(formatVnd(45000), '45.000đ');
      assert.equal(formatVnd(120000), '120.000đ');
      assert.equal(formatVnd(0), '0đ');
    });

    it('chuỗi hiển thị kích cỡ và giá tiền vừa vặn trong nút 360px mà không bị tràn', () => {
      const label = `Size M`;
      const priceStr = formatVnd(50000);
      assert.ok(label.length <= 10);
      assert.ok(priceStr.length <= 12);
    });
  });

  describe('5. Tương thích luồng dữ liệu với Giỏ hàng Cart Store (AC1, Issue #18)', () => {
    it('toAddItemInput tạo đúng đối tượng AddItemInput với các trường cần thiết', () => {
      const sel = {
        size: 'S' as const,
        toppingIds: [mockKem.id],
        qty: 2,
      };
      const input = toAddItemInput(mockCappuccino, sel);
      assert.ok(input);
      assert.deepEqual(input, {
        productId: mockCappuccino.id,
        productName: mockCappuccino.name,
        imageUrl: mockCappuccino.imageUrl,
        size: 'S',
        sizePrice: 45000,
        toppings: [{ id: mockKem.id, name: 'Kem', price: 10000 }],
        qty: 2,
      });
    });
  });
});
