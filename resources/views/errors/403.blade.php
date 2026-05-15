<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>غير مصرح — إدارة المطعم</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: 'Segoe UI', Tahoma, sans-serif;
            background: #1c0a0b;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1rem;
        }
        .card {
            background: white;
            border-radius: 1.25rem;
            padding: 3rem 2.5rem;
            text-align: center;
            max-width: 400px;
            width: 100%;
            box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
        }
        .icon {
            width: 64px; height: 64px;
            background: #fee2e2;
            border-radius: 1rem;
            display: flex; align-items: center; justify-content: center;
            margin: 0 auto 1.5rem;
            font-size: 2rem;
        }
        .code {
            font-size: 3.5rem;
            font-weight: 900;
            color: #ee1d23;
            line-height: 1;
            margin-bottom: 0.5rem;
        }
        .title {
            font-size: 1.125rem;
            font-weight: 700;
            color: #1e293b;
            margin-bottom: 0.75rem;
        }
        .message {
            font-size: 0.875rem;
            color: #64748b;
            line-height: 1.6;
            margin-bottom: 2rem;
        }
        .btn {
            display: inline-block;
            background: #ee1d23;
            color: white;
            font-weight: 700;
            font-size: 0.875rem;
            padding: 0.625rem 1.5rem;
            border-radius: 0.75rem;
            text-decoration: none;
            transition: background 0.2s;
        }
        .btn:hover { background: #d01920; }
        .footer {
            margin-top: 2rem;
            font-size: 0.75rem;
            color: #cbd5e1;
        }
    </style>
</head>
<body>
    <div class="card">
        <div class="icon">🔒</div>
        <div class="code">403</div>
        <div class="title">غير مصرح بالوصول</div>
        <div class="message">
            ليس لديك الصلاحية للوصول إلى هذه الصفحة.<br>
            تواصل مع مدير النظام لمنحك الأذونات اللازمة.
        </div>
        <a href="javascript:history.back()" class="btn">← العودة للخلف</a>
    </div>
</body>
</html>
