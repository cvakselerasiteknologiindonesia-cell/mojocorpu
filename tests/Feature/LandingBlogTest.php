<?php

namespace Tests\Feature;

use App\Models\BlogPost;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LandingBlogTest extends TestCase
{
    use RefreshDatabase;

    public function test_landing_page_displays_the_three_latest_published_articles(): void
    {
        $author = User::factory()->create([
            'name' => 'Editor CorpU',
            'opd_name' => 'BKPSDM',
        ]);

        foreach (range(1, 4) as $index) {
            BlogPost::query()->create([
                'author_id' => $author->id,
                'title' => "Artikel Publik {$index}",
                'slug' => "artikel-publik-{$index}",
                'category' => 'Pengembangan ASN',
                'excerpt' => "Ringkasan artikel publik {$index}.",
                'body' => "<p>Isi artikel publik {$index} untuk pengembangan kompetensi ASN.</p>",
                'status' => 'published',
                'published_at' => now()->subDays(4 - $index),
            ]);
        }

        BlogPost::query()->create([
            'author_id' => $author->id,
            'title' => 'Artikel Masih Draft',
            'slug' => 'artikel-masih-draft',
            'body' => '<p>Artikel ini belum boleh tampil di landing page.</p>',
            'status' => 'draft',
        ]);

        $response = $this->get('/');

        $response->assertOk()
            ->assertSee('href="'.route('login').'"', false)
            ->assertSee('Artikel Publik 4')
            ->assertSee('Artikel Publik 3')
            ->assertSee('Artikel Publik 2')
            ->assertSee('/artikel/artikel-publik-4', false)
            ->assertDontSee('Artikel Publik 1')
            ->assertDontSee('Artikel Masih Draft');
    }

    public function test_published_article_has_a_public_detail_page(): void
    {
        $author = User::factory()->create([
            'name' => 'Editor CorpU',
            'opd_name' => 'BKPSDM',
        ]);

        $post = BlogPost::query()->create([
            'author_id' => $author->id,
            'title' => 'Budaya Belajar ASN',
            'slug' => 'budaya-belajar-asn',
            'category' => 'Pengembangan ASN',
            'excerpt' => 'Ringkasan budaya belajar ASN.',
            'tags' => ['corpu', 'asn'],
            'body' => '<h2>Belajar Berkelanjutan</h2><p>Isi lengkap artikel pengembangan kompetensi.</p>',
            'status' => 'published',
            'published_at' => now(),
        ]);

        $this->get(route('articles.show', $post->slug))
            ->assertOk()
            ->assertSee('Budaya Belajar ASN')
            ->assertSee('Editor CorpU')
            ->assertSee('Pengembangan ASN')
            ->assertSee('Belajar Berkelanjutan', false)
            ->assertSee('Isi lengkap artikel pengembangan kompetensi.', false);
    }

    public function test_draft_article_does_not_have_a_public_detail_page(): void
    {
        $post = BlogPost::query()->create([
            'author_id' => User::factory()->create()->id,
            'title' => 'Artikel Draft',
            'slug' => 'artikel-draft',
            'body' => '<p>Isi artikel yang belum diterbitkan.</p>',
            'status' => 'draft',
        ]);

        $this->get(route('articles.show', $post->slug))->assertNotFound();
    }
}
