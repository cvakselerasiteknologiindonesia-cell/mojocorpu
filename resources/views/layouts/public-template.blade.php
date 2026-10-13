<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8">
<title>@yield('title', 'Corporate University BKPSDM Kabupaten Mojokerto')</title>
<meta name="description" content="@yield('meta_description', 'Corporate University BKPSDM Kabupaten Mojokerto untuk pengembangan kompetensi ASN yang terarah, terukur, dan berkelanjutan.')">

<!-- Stylesheets -->
<link href="/template/css/bootstrap.css" rel="stylesheet">
<link href="/template/plugins/revolution/css/settings.css" rel="stylesheet">
<link href="/template/plugins/revolution/css/layers.css" rel="stylesheet">
<link href="/template/plugins/revolution/css/navigation.css" rel="stylesheet">
<link href="/template/css/style.css" rel="stylesheet">
<link href="/template/css/responsive.css" rel="stylesheet">
@stack('styles')

<!--Favicon-->
<link rel="shortcut icon" href="/template/images/favicon.ico" type="image/x-icon">
<link rel="icon" href="/template/images/favicon.ico" type="image/x-icon">
<!-- Responsive -->
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0">
<!--[if lt IE 9]><script src="https://cdnjs.cloudflare.com/ajax/libs/html5shiv/3.7.3/html5shiv.js"></script><![endif]-->
<!--[if lt IE 9]><script src="/template/js/respond.js"></script><![endif]-->
</head>

<body>
<div class="page-wrapper">

    <!-- Preloader -->
    <div class="preloader"></div>

    @include('partials.public-header', ['activeNav' => trim($__env->yieldContent('active_nav', 'home')) ?: 'home'])

    @yield('content')

    @include('partials.public-footer')

</div>
<!--End pagewrapper-->

<!-- Scroll Top Button -->
<button class="scroll-top scroll-to-target" data-target="html">
    <span class="fa fa-angle-up"></span>
</button>

<!-- jequery plugins -->
<script src="/template/js/jquery.js"></script>
<script src="/template/js/popover.js"></script>
<script src="/template/js/bootstrap.min.js"></script>
@stack('plugin-scripts')
<script src="/template/js/plugins.js"></script>
<script src="/template/js/validate.js"></script>
<script src="/template/js/jquery.fancybox.pack.js"></script>
<script src="/template/js/jquery.fancybox-media.js"></script>
<script src="/template/js/script.js"></script>
@stack('scripts')

</body>
</html>
