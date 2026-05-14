<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Xác thực tài khoản - Dola Bakery</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, sans-serif;">
    <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #f09a29 0%, #ffc107 100%); padding: 30px; text-align: center;">
            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">🍞 Dola Bakery</h1>
        </div>
        
        <!-- Content -->
        <div style="padding: 40px 30px;">
            <h2 style="color: #f09a29; margin: 0 0 20px 0; font-size: 24px;">Chào mừng đến với Dola Bakery!</h2>
            
            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Xin chào <strong style="color: #f09a29;">{{ $user->name }}</strong>,
            </p>
            
            <p style="color: #666666; font-size: 15px; line-height: 1.6; margin: 0 0 30px 0;">
                Cảm ơn bạn đã đăng ký tài khoản tại <strong>Dola Bakery</strong>. Để hoàn tất đăng ký và bắt đầu mua sắm, 
                vui lòng xác thực email của bạn bằng cách nhấn vào nút bên dưới:
            </p>
            
            <!-- CTA Button -->
            <div style="text-align: center; margin: 30px 0;">
                <a href="{{ $verifyUrl }}" 
                   style="display: inline-block; padding: 14px 40px; background-color: #f09a29; color: #ffffff; 
                          text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; 
                          box-shadow: 0 2px 8px rgba(240, 154, 41, 0.3);">
                    ✉️ Xác thực tài khoản
                </a>
            </div>
            
            <!-- Alternative link -->
            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 6px; margin: 20px 0;">
                <p style="margin: 0 0 10px 0; color: #666666; font-size: 13px; font-weight: bold;">Hoặc copy link sau vào trình duyệt:</p>
                <p style="margin: 0; word-break: break-all; color: #007bff; font-size: 12px;">{{ $verifyUrl }}</p>
            </div>
            
            <p style="color: #999999; font-size: 13px; margin: 20px 0 0 0; line-height: 1.6;">
                📌 <strong>Lưu ý:</strong> Link xác thực này có hiệu lực trong <strong>24 giờ</strong>. 
                Nếu link hết hạn, bạn có thể yêu cầu gửi lại email xác thực từ trang đăng nhập.
            </p>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f9f9f9; padding: 20px 30px; border-top: 1px solid #eeeeee;">
            <p style="margin: 0 0 10px 0; color: #999999; font-size: 12px;">
                Nếu bạn không đăng ký tài khoản này, vui lòng bỏ qua email này.
            </p>
            <p style="margin: 0; color: #cccccc; font-size: 11px;">
                © 2025 Dola Bakery. Đây là email tự động, vui lòng không trả lời email này.
            </p>
        </div>
    </div>
</body>
</html>


