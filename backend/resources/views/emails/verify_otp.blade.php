<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Mã xác thực OTP</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="font-family:Segoe UI,Arial,sans-serif;background:#f6f7f9;padding:24px;color:#222">
  <table width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #eee">
    <tr>
      <td style="background:#f09a29;color:#fff;padding:16px 20px;font-weight:600;font-size:16px">Dola Bakery</td>
    </tr>
    <tr>
      <td style="padding:20px">
        <h2 style="margin:0 0 12px 0;font-size:18px;color:#222">Xin chào {{ $user->name ?? 'bạn' }},</h2>
        <p style="margin:0 0 12px 0;line-height:1.6">Đây là <strong>mã OTP</strong> để xác thực email đăng ký tài khoản của bạn.</p>
        <div style="text-align:center;margin:20px 0">
          <div style="display:inline-block;font-size:28px;letter-spacing:6px;font-weight:700;background:#222;color:#fff;padding:12px 18px;border-radius:8px">{{ $otp }}</div>
        </div>
        <p style="margin:0 0 12px 0;line-height:1.6">Mã có hiệu lực trong <strong>10 phút</strong>. Vui lòng không chia sẻ mã này cho bất kỳ ai.</p>
        <p style="margin:0 0 12px 0;line-height:1.6">Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email.</p>
        <p style="margin:24px 0 0 0;font-size:12px;color:#666">&copy; {{ date('Y') }} Dola Bakery</p>
      </td>
    </tr>
  </table>
</body>
</html>


