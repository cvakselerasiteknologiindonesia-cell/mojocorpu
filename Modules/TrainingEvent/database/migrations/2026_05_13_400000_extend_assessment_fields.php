<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('event_assessments', function (Blueprint $table) {
            $table->unsignedSmallInteger('bank_draw_count')->nullable()->after('status');
        });

        Schema::table('assessment_questions', function (Blueprint $table) {
            $table->boolean('in_bank')->default(false)->after('order');
            $table->text('correct_answer')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('event_assessments', function (Blueprint $table) {
            $table->dropColumn('bank_draw_count');
        });

        Schema::table('assessment_questions', function (Blueprint $table) {
            $table->dropColumn('in_bank');
            $table->string('correct_answer')->nullable()->change();
        });
    }
};
