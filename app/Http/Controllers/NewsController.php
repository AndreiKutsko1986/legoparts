<?php

namespace App\Http\Controllers;

use App\Models\NewsArticle;
use Illuminate\Http\JsonResponse;

class NewsController extends Controller
{
    public function index(): JsonResponse
    {
        $articles = NewsArticle::where('is_published', true)
            ->orderByDesc('published_at')
            ->get(['id', 'title', 'slug', 'summary', 'published_at']);

        return response()->json($articles->map(fn (NewsArticle $a) => [
            'id'          => $a->id,
            'title'       => $a->title,
            'slug'        => $a->slug,
            'summary'     => $a->summary,
            'publishedAt' => $a->published_at->toIso8601String(),
        ])->values()->all());
    }

    public function show(string $slug): JsonResponse
    {
        $article = NewsArticle::where('slug', $slug)
            ->where('is_published', true)
            ->firstOrFail();

        return response()->json([
            'id'          => $article->id,
            'title'       => $article->title,
            'slug'        => $article->slug,
            'summary'     => $article->summary,
            'content'     => $article->content,
            'publishedAt' => $article->published_at->toIso8601String(),
        ]);
    }
}
