<!doctype html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Memproses SSO</title>
    <style>
        body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:Inter,ui-sans-serif,system-ui,sans-serif;color:#0d0d0d;background:#fafafa}
        .box{width:min(420px,calc(100vw - 32px));border:1px solid #e3e3e3;background:#fff;padding:24px}
        .mono{font-family:monospace;font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#6b6b6b}
        h1{font-size:22px;font-weight:400;margin:10px 0 6px}p{margin:0;color:#6b6b6b;font-size:14px;line-height:1.6}.err{color:#d04352}
        a{display:inline-block;margin-top:16px;color:#0d0d0d}
    </style>
</head>
<body>
    <main class="box">
        <div class="mono">Corporate University BKPSDM</div>
        @if ($error)
            <h1>SSO gagal</h1>
            <p class="err">{{ $error }}</p>
            <a href="/">Kembali ke login</a>
        @else
            <h1>SSO berhasil</h1>
            <p>Anda sedang diarahkan ke halaman tujuan.</p>
        @endif
    </main>

    @if ($sessionPayload)
        <script>
            localStorage.setItem('corpu_session', JSON.stringify(@json($sessionPayload)));
            const target = sessionStorage.getItem('corpu_post_login_path') || '/dashboard';
            sessionStorage.removeItem('corpu_post_login_path');
            window.location.replace(target);
        </script>
    @endif
</body>
</html>
