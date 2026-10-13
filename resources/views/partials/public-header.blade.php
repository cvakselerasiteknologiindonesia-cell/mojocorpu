<!-- main header -->
<header class="main-header">

    <!-- header top -->
    <div class="header-top black-bg-4">
        <div class="container clearfix">
            <div class="top-left pull-left">
                <ul class="links-nav clearfix">
                    <li><i class="fa fa-map-marker"></i>Jl. Ahmad Yani No.16, Mergelo, Magersari, Kota Mojokerto</li>
                    <li><i class="fa fa-phone"></i>+62 321 322817</li>
                    <li><i class="fa fa-envelope-o"></i>BKPSDM Kabupaten Mojokerto</li>
                </ul>
            </div>

            <div class="top-right pull-right">
                <div class="social-links clearfix">
                    <a href="#"><span class="fa fa-facebook-f"></span></a>
                    <a href="#"><span class="fa fa-twitter"></span></a>
                    <a href="#"><span class="fa fa-linkedin"></span></a>
                    <a href="#"><span class="fa fa-instagram"></span></a>
                </div>
            </div>
        </div>
    </div>

    <!--Header-Upper-->
    <div class="header-upper style-two">
        <div class="container clearfix">
            <div class="float-left logo-outer">
                <div class="logo"><a href="{{ route('landing') }}"><img src="/template/images/logo.png" alt="CorpU BKPSDM" title=""></a></div>
            </div>

            <div class="float-right upper-right clearfix">
                <div class="nav-outer clearfix">
                    <nav class="main-menu navbar-expand-lg">
                        <div class="navbar-header">
                            <button type="button" class="navbar-toggle" data-toggle="collapse" data-target=".navbar-collapse">
                            <span class="icon-bar"></span>
                            <span class="icon-bar"></span>
                            <span class="icon-bar"></span>
                            </button>
                        </div>

                        <div class="navbar-collapse collapse clearfix">
                            @include('partials.public-nav', ['activeNav' => $activeNav, 'loginPadding' => '12px 28px', 'loginMargin' => '22px'])
                        </div>
                    </nav>
                </div>
            </div>
        </div>
    </div>

    <!--Sticky Header-->
    <div class="sticky-header">
        <div class="container clearfix">
            <div class="logo float-left">
                <a href="{{ route('landing') }}" class="img-responsive"><img src="/template/images/logo.png" alt="CorpU BKPSDM" title=""></a>
            </div>
            <div class="right-col float-right">
                <nav class="main-menu navbar-expand-lg">
                    <div class="navbar-collapse collapse clearfix">
                        @include('partials.public-nav', ['activeNav' => $activeNav, 'loginPadding' => '10px 24px', 'loginMargin' => '16px'])
                    </div>
                </nav>
            </div>
        </div>
    </div>
</header>
