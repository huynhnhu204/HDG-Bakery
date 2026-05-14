<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Xác nhận đơn hàng - Dola Bakery</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, sans-serif;">
    <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #f09a29 0%, #ffc107 100%); padding: 30px; text-align: center;">
            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">🍞 Dola Bakery</h1>
        </div>
        
        <!-- Content -->
        <div style="padding: 40px 30px;">
            <h2 style="color: #f09a29; margin: 0 0 20px 0; font-size: 24px;">Đặt hàng thành công!</h2>
            
            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Xin chào <strong style="color: #f09a29;">{{ $order->name }}</strong>,
            </p>
            
            <p style="color: #666666; font-size: 15px; line-height: 1.6; margin: 0 0 30px 0;">
                Cảm ơn bạn đã đặt hàng tại <strong>Dola Bakery</strong>. Chúng tôi đã nhận được đơn hàng của bạn và đang xử lý.
            </p>

            <!-- Order Info Card -->
            <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f09a29;">
                <p style="margin: 0 0 10px 0; color: #333333; font-size: 14px;">
                    <strong style="color: #f09a29;">Mã đơn hàng:</strong> 
                    <span style="font-size: 18px; font-weight: bold; color: #333;">{{ $code ?? ($order->code ?? ('#' . $order->id)) }}</span>
                </p>
                <p style="margin: 5px 0; color: #666666; font-size: 14px;">
                    <strong>Ngày đặt:</strong> {{ \Carbon\Carbon::parse($order->created_at)->format('d/m/Y H:i') }}
                </p>
                <p style="margin: 5px 0; color: #666666; font-size: 14px;">
                    <strong>Trạng thái:</strong> 
                    <span style="color: #f09a29; font-weight: bold;">Đang xử lý</span>
                </p>
            </div>

            <!-- Customer Info -->
            <div style="margin: 25px 0;">
                <h3 style="color: #333333; font-size: 18px; margin: 0 0 15px 0; border-bottom: 2px solid #f09a29; padding-bottom: 8px;">
                    Thông tin khách hàng
                </h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 8px 0; color: #666666; font-size: 14px; width: 120px;"><strong>Họ tên:</strong></td>
                        <td style="padding: 8px 0; color: #333333; font-size: 14px;">{{ $order->name }}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #666666; font-size: 14px;"><strong>Điện thoại:</strong></td>
                        <td style="padding: 8px 0; color: #333333; font-size: 14px;">{{ $order->phone }}</td>
                    </tr>
                    @if($order->email)
                    <tr>
                        <td style="padding: 8px 0; color: #666666; font-size: 14px;"><strong>Email:</strong></td>
                        <td style="padding: 8px 0; color: #333333; font-size: 14px;">{{ $order->email }}</td>
                    </tr>
                    @endif
                    <tr>
                        <td style="padding: 8px 0; color: #666666; font-size: 14px; vertical-align: top;"><strong>Địa chỉ:</strong></td>
                        <td style="padding: 8px 0; color: #333333; font-size: 14px;">{{ $order->address }}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #666666; font-size: 14px;"><strong>Phương thức:</strong></td>
                        <td style="padding: 8px 0; color: #333333; font-size: 14px;">
                            @if($order->payment_method === 'COD')
                                💵 Thanh toán khi nhận hàng (COD)
                            @elseif($order->payment_method === 'Bank')
                                🏦 Chuyển khoản ngân hàng
                            @else
                                {{ $order->payment_method }}
                            @endif
                        </td>
                    </tr>
                    @if($order->note)
                    <tr>
                        <td style="padding: 8px 0; color: #666666; font-size: 14px; vertical-align: top;"><strong>Ghi chú:</strong></td>
                        <td style="padding: 8px 0; color: #333333; font-size: 14px;">{{ $order->note }}</td>
                    </tr>
                    @endif
                </table>
            </div>

            <!-- Order Items -->
            <div style="margin: 25px 0;">
                <h3 style="color: #333333; font-size: 18px; margin: 0 0 15px 0; border-bottom: 2px solid #f09a29; padding-bottom: 8px;">
                    Chi tiết đơn hàng
                </h3>
                <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                    <thead>
                        <tr style="background-color: #f9f9f9;">
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd; color: #333333; font-size: 14px;">Sản phẩm</th>
                            <th style="padding: 12px; text-align: center; border-bottom: 2px solid #ddd; color: #333333; font-size: 14px; width: 60px;">SL</th>
                            <th style="padding: 12px; text-align: right; border-bottom: 2px solid #ddd; color: #333333; font-size: 14px; width: 100px;">Đơn giá</th>
                            <th style="padding: 12px; text-align: right; border-bottom: 2px solid #ddd; color: #333333; font-size: 14px; width: 120px;">Thành tiền</th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach($order->details as $detail)
                        <tr>
                            <td style="padding: 12px; border-bottom: 1px solid #eee; color: #333333; font-size: 14px;">
                                {{ $detail->name ?? ('Sản phẩm #' . $detail->product_id) }}
                                @if($detail->variant_name)
                                    <br><span style="color: #999; font-size: 12px;">({{ $detail->variant_name }})</span>
                                @endif
                            </td>
                            <td style="padding: 12px; text-align: center; border-bottom: 1px solid #eee; color: #666666; font-size: 14px;">
                                {{ number_format($detail->qty, 0, ',', '.') }}
                            </td>
                            <td style="padding: 12px; text-align: right; border-bottom: 1px solid #eee; color: #666666; font-size: 14px;">
                                {{ number_format($detail->price, 0, ',', '.') }}đ
                            </td>
                            <td style="padding: 12px; text-align: right; border-bottom: 1px solid #eee; color: #333333; font-size: 14px; font-weight: bold;">
                                {{ number_format($detail->amount ?? ($detail->price * $detail->qty), 0, ',', '.') }}đ
                            </td>
                        </tr>
                        @endforeach
                    </tbody>
                </table>
            </div>

            <!-- Order Summary -->
            <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #333333; font-size: 18px; margin: 0 0 15px 0;">Tổng kết đơn hàng</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 8px 0; color: #666666; font-size: 14px;">Tạm tính:</td>
                        <td style="padding: 8px 0; text-align: right; color: #333333; font-size: 14px;">
                            {{ number_format($subtotal, 0, ',', '.') }}đ
                        </td>
                    </tr>
                    @if(isset($discountAmount) && $discountAmount > 0)
                    <tr>
                        <td style="padding: 8px 0; color: #28a745; font-size: 14px;">
                            <strong>Giảm giá 
                            @if($order->coupon_code)
                                ({{ $order->coupon_code }})
                            @endif
                            :</strong>
                        </td>
                        <td style="padding: 8px 0; text-align: right; color: #28a745; font-size: 14px; font-weight: bold;">
                            -{{ number_format($discountAmount, 0, ',', '.') }}đ
                        </td>
                    </tr>
                    @endif
                    <tr>
                        <td style="padding: 8px 0; color: #666666; font-size: 14px;">Phí vận chuyển:</td>
                        <td style="padding: 8px 0; text-align: right; color: #333333; font-size: 14px;">
                            @if(isset($shipping) && $shipping > 0)
                                {{ number_format($shipping, 0, ',', '.') }}đ
                            @else
                                <span style="color: #28a745;">Miễn phí</span>
                            @endif
                        </td>
                    </tr>
                    <tr style="border-top: 2px solid #ddd; margin-top: 10px;">
                        <td style="padding: 12px 0; color: #333333; font-size: 18px; font-weight: bold;">Tổng cộng:</td>
                        <td style="padding: 12px 0; text-align: right; color: #f09a29; font-size: 20px; font-weight: bold;">
                            @php
                                $finalTotal = $subtotal - ($discountAmount ?? 0) + ($shipping ?? 0);
                            @endphp
                            {{ number_format($finalTotal, 0, ',', '.') }}đ
                        </td>
                    </tr>
                </table>
            </div>

            <!-- Next Steps -->
            <div style="background-color: #e7f3ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #007bff;">
                <h3 style="color: #007bff; font-size: 16px; margin: 0 0 10px 0;">📋 Bước tiếp theo:</h3>
                <ul style="margin: 0; padding-left: 20px; color: #333333; font-size: 14px; line-height: 1.8;">
                    <li>Chúng tôi sẽ xác nhận đơn hàng của bạn trong thời gian sớm nhất</li>
                    <li>Bạn sẽ nhận được thông báo khi đơn hàng được giao cho đơn vị vận chuyển</li>
                    @if($order->payment_method === 'Bank')
                    <li>Vui lòng thanh toán đúng số tiền và ghi chú đúng mã đơn hàng khi chuyển khoản</li>
                    @endif
                    <li>Nếu có bất kỳ thắc mắc nào, vui lòng liên hệ hotline: <strong>1900 6750</strong></li>
                </ul>
            </div>

            <p style="color: #666666; font-size: 15px; line-height: 1.6; margin: 30px 0 0 0; text-align: center;">
                Cảm ơn bạn đã tin tưởng và mua sắm tại <strong style="color: #f09a29;">Dola Bakery</strong>! 🎉
            </p>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f9f9f9; padding: 20px 30px; border-top: 1px solid #eeeeee;">
            <p style="margin: 0 0 10px 0; color: #999999; font-size: 12px; text-align: center;">
                Đây là email tự động từ hệ thống. Vui lòng không trả lời email này.
            </p>
            <p style="margin: 0; color: #cccccc; font-size: 11px; text-align: center;">
                © 2025 Dola Bakery. Mọi quyền được bảo lưu.
            </p>
        </div>
    </div>
</body>
</html>

