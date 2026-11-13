import { test, expect } from '@playwright/test';

test.describe('End-to-End Checkout Flow (Task 4.4 / Issue #20)', () => {
  const timestamp = Date.now();
  const customerEmail = `e2e-user-${timestamp}@test.com`;
  const customerPassword = 'Password123!';
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

  test('Full Journey: Menu -> Product Selection -> Cart -> Register/Login -> Order -> Mock Payment FAIL -> Retry SUCCESS -> Order History -> Staff COMPLETED & Loyalty Points', async ({
    page,
    request,
  }) => {
    // -------------------------------------------------------------------------
    // 1. Xem menu (Browse Menu)
    // -------------------------------------------------------------------------
    await page.goto('/menu');
    await expect(page).toHaveTitle(/BrewLite/i);
    await expect(page.locator('h1')).toContainText('Đặt Món Trực Tuyến');

    // Chờ danh sách sản phẩm hiển thị trên lưới menu
    const firstProductCard = page.locator('article').first();
    await expect(firstProductCard).toBeVisible({ timeout: 15000 });

    const productName = await firstProductCard.locator('h3').innerText();
    expect(productName.length).toBeGreaterThan(0);

    // -------------------------------------------------------------------------
    // 2. Chọn món, size & topping (Product Detail & Add to Cart)
    // -------------------------------------------------------------------------
    await firstProductCard.locator('a').first().click();
    await expect(page).toHaveURL(/\/products\/[a-f0-9-]+/);
    await expect(page.locator('h1')).toContainText(productName);

    // Chọn size nếu có nhiều size (nút đầu tiên thường là size mặc định)
    const sizeButtons = page.locator('fieldset').first().locator('button, input[type="radio"]');
    if ((await sizeButtons.count()) > 0) {
      await sizeButtons.first().click();
    }

    // Bấm thêm vào giỏ hàng
    const addToCartButton = page.locator('button:has-text("Thêm vào giỏ hàng")');
    await expect(addToCartButton).toBeEnabled();
    await addToCartButton.click();

    // Xác nhận thông báo đã thêm món vào giỏ
    await expect(page.locator('text=Đã thêm vào giỏ hàng.')).toBeVisible({ timeout: 5000 });

    // -------------------------------------------------------------------------
    // 3. Giỏ hàng (Cart Page)
    // -------------------------------------------------------------------------
    await page.goto('/cart');
    await expect(page.locator('h1')).toContainText('Đồ Uống Của Bạn');
    await expect(page.locator(`text=${productName}`).first()).toBeVisible();

    // Tiếp tục chuyển sang trang thanh toán
    const proceedCheckoutLink = page.locator('a:has-text("Tiếp tục thanh toán")');
    await expect(proceedCheckoutLink).toBeVisible();
    await proceedCheckoutLink.click();

    await expect(page).toHaveURL('/checkout');

    // -------------------------------------------------------------------------
    // 4. Đăng ký tài khoản khách hàng mới (Register Customer)
    // -------------------------------------------------------------------------
    // Khi chưa đăng nhập, trang checkout yêu cầu đăng nhập
    await expect(page.locator('text=Đăng nhập để tạo đơn.')).toBeVisible({ timeout: 5000 });

    await page.goto('/register');
    await expect(page.locator('h1')).toContainText('Đăng ký tài khoản');

    await page.fill('#email', customerEmail);
    await page.fill('#password', customerPassword);
    await page.fill('#confirmPassword', customerPassword);
    await page.click('button[type="submit"]');

    // Sau khi đăng ký thành công, hệ thống lưu token và chuyển hướng về trang chủ
    await page.waitForURL('/', { timeout: 10000 });

    // -------------------------------------------------------------------------
    // 5. Quay lại giỏ hàng và Đặt đơn (Place Order)
    // -------------------------------------------------------------------------
    await page.goto('/checkout');

    // Kiểm tra thông tin báo giá và danh sách món trong đơn
    const placeOrderButton = page.locator('button:has-text("Đặt đơn & Tiếp tục thanh toán")');
    await expect(placeOrderButton).toBeVisible({ timeout: 10000 });
    await placeOrderButton.click();

    // Đơn được tạo chuyển sang bước 2: "2. Giữ hàng & Thanh toán"
    await expect(page.locator('text=2. Giữ hàng & Thanh toán')).toBeVisible({ timeout: 15000 });

    // Lấy mã đơn hàng và ID đơn hàng từ URL hoặc giao diện
    const orderCodeLocator = page.locator('h2:has-text("Đơn BL-")');
    await expect(orderCodeLocator).toBeVisible();
    const orderCodeText = await orderCodeLocator.innerText();
    const orderCode = orderCodeText.replace('Đơn ', '').trim();
    expect(orderCode).toMatch(/^BL-[A-Z0-9-]+$/);

    // Lấy token đăng nhập của khách hàng từ sessionStorage trong trình duyệt
    const customerToken = await page.evaluate(() => sessionStorage.getItem('brewlite_access_token'));
    expect(customerToken).toBeTruthy();

    // Truy vấn thông tin đơn hiện hành của khách
    const ordersRes = await request.get(`${apiBaseUrl}/orders/me`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    expect(ordersRes.status()).toBe(200);
    const ordersData = await ordersRes.json();
    const currentOrder = ordersData.data.find((o: { code: string }) => o.code === orderCode);
    expect(currentOrder).toBeDefined();
    const orderId = currentOrder.id;

    // -------------------------------------------------------------------------
    // 6. Thanh toán mô phỏng FAIL (Mock Payment FAIL)
    // -------------------------------------------------------------------------
    const failPaymentRes = await request.post(`${apiBaseUrl}/payments`, {
      headers: {
        Authorization: `Bearer ${customerToken}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': crypto.randomUUID(),
      },
      data: {
        orderId,
        method: 'WALLET',
        mockOutcome: 'FAIL',
      },
    });
    expect(failPaymentRes.status()).toBe(200);
    const failResult = await failPaymentRes.json();
    expect(failResult.payment.status).toBe('FAILED');
    expect(failResult.order.status).toBe('PAYMENT_FAILED');

    // Kiểm tra trạng thái đơn đã chuyển sang PAYMENT_FAILED và giải phóng kho (RELEASED)
    const checkFailedOrder = await request.get(`${apiBaseUrl}/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    const failedOrderData = await checkFailedOrder.json();
    expect(failedOrderData.status).toBe('PAYMENT_FAILED');
    expect(failedOrderData.reservationStatus).toBe('RELEASED');

    // -------------------------------------------------------------------------
    // 7. Thử lại thanh toán SUCCESS trên cùng đơn (Retry Payment SUCCESS)
    // -------------------------------------------------------------------------
    const successPaymentRes = await request.post(`${apiBaseUrl}/payments`, {
      headers: {
        Authorization: `Bearer ${customerToken}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': crypto.randomUUID(),
      },
      data: {
        orderId,
        method: 'CARD',
        mockOutcome: 'SUCCESS',
      },
    });
    expect(successPaymentRes.status()).toBe(200);
    const successResult = await successPaymentRes.json();
    expect(successResult.payment.status).toBe('SUCCEEDED');
    expect(successResult.order.status).toBe('PAID');

    // Kiểm tra trạng thái đơn đã chuyển sang PAID và kho chuyển sang CONSUMED
    const checkPaidOrder = await request.get(`${apiBaseUrl}/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    const paidOrderData = await checkPaidOrder.json();
    expect(paidOrderData.status).toBe('PAID');
    expect(paidOrderData.reservationStatus).toBe('CONSUMED');

    // -------------------------------------------------------------------------
    // 8. Xem xác nhận & Lịch sử đơn hàng (Customer Orders History)
    // -------------------------------------------------------------------------
    await page.goto('/orders');
    await expect(page.locator('h1')).toContainText('Lịch Sử Đơn Hàng');
    await expect(page.locator(`text=${orderCode}`).first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Đã thanh toán (PAID)').first()).toBeVisible();

    // Mở trang chi tiết đơn hàng /orders/[id]
    await page.goto(`/orders/${orderId}`);
    await expect(page.locator('h1')).toContainText(`Chi Tiết Đơn Hàng ${orderCode}`);
    await expect(page.locator('text=Thanh toán thành công!')).toBeVisible();

    // -------------------------------------------------------------------------
    // 9. Nhân viên quầy chuyển trạng thái đến COMPLETED & tích điểm (Staff Workflow)
    // -------------------------------------------------------------------------
    // Đăng nhập tài khoản Staff bằng tài khoản seed (hoặc tạo tài khoản staff test)
    const staffPassword = process.env.SEED_STAFF_PASSWORD || 'ci-staff-password-1';
    let staffToken: string;

    const staffLoginRes = await request.post(`${apiBaseUrl}/auth/login`, {
      data: { email: 'staff@brewlite.local', password: staffPassword },
    });

    if (staffLoginRes.status() === 200) {
      const loginData = await staffLoginRes.json();
      staffToken = loginData.accessToken;
    } else {
      // Nếu tài khoản seed chưa chạy, đăng ký / tạo mới tài khoản staff
      const registerStaffRes = await request.post(`${apiBaseUrl}/auth/register`, {
        data: { email: `staff-${timestamp}@test.com`, password: 'StaffPassword123!' },
      });
      const regData = await registerStaffRes.json();
      staffToken = regData.accessToken;
    }

    // Nhân viên chuyển trạng thái tuần tự: PAID -> PREPARING -> READY -> COMPLETED
    // Bước a: PAID -> PREPARING
    const prepRes = await request.patch(`${apiBaseUrl}/orders/${orderId}/status`, {
      headers: { Authorization: `Bearer ${staffToken}` },
      data: { status: 'PREPARING', expectedVersion: paidOrderData.version },
    });
    expect(prepRes.status()).toBe(200);
    const prepOrder = await prepRes.json();
    expect(prepOrder.status).toBe('PREPARING');

    // Bước b: PREPARING -> READY
    const readyRes = await request.patch(`${apiBaseUrl}/orders/${orderId}/status`, {
      headers: { Authorization: `Bearer ${staffToken}` },
      data: { status: 'READY', expectedVersion: prepOrder.version },
    });
    expect(readyRes.status()).toBe(200);
    const readyOrder = await readyRes.json();
    expect(readyOrder.status).toBe('READY');

    // Bước c: READY -> COMPLETED (Kích hoạt cộng điểm thưởng vào sổ cái bất biến)
    const completeRes = await request.patch(`${apiBaseUrl}/orders/${orderId}/status`, {
      headers: { Authorization: `Bearer ${staffToken}` },
      data: { status: 'COMPLETED', expectedVersion: readyOrder.version },
    });
    expect(completeRes.status()).toBe(200);
    const completedOrder = await completeRes.json();
    expect(completedOrder.status).toBe('COMPLETED');

    // -------------------------------------------------------------------------
    // 10. Kiểm tra số dư điểm thưởng của khách hàng (Loyalty Ledger)
    // -------------------------------------------------------------------------
    const loyaltyRes = await request.get(`${apiBaseUrl}/loyalty/me`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    expect(loyaltyRes.status()).toBe(200);
    const loyaltyData = await loyaltyRes.json();
    expect(loyaltyData.points).toBeGreaterThan(0);
  });
});
