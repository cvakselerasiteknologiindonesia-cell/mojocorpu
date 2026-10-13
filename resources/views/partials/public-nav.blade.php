<ul class="navigation clearfix">
    <li class="{{ $activeNav === 'home' ? 'current' : '' }}"><a href="{{ route('landing') }}#home">Beranda</a></li>
    <li class="{{ $activeNav === 'about' ? 'current' : '' }}"><a href="{{ route('landing') }}#about">Tentang</a></li>
    <li class="{{ $activeNav === 'academy' ? 'current' : '' }}"><a href="{{ route('landing') }}#services">Unggulan</a></li>
    <li class="{{ $activeNav === 'curriculum' ? 'current' : '' }}"><a href="{{ route('landing') }}#curriculum">Katalog</a></li>
    <li class="{{ $activeNav === 'blog' ? 'current' : '' }}"><a href="{{ route('landing') }}#blog">Artikel & Berita</a></li>
    <li class="{{ $activeNav === 'contact' ? 'current' : '' }}"><a href="{{ route('landing') }}#contact">Kontak</a></li>
    <li><a href="/login" class="theme-btn btn-style-two" style="padding: {{ $loginPadding }}; margin-top: {{ $loginMargin }}; line-height: 24px; color: #ffffff;">Login</a></li>
</ul>
