<?php

namespace Tests\Feature;

use App\Models\LearningPath;
use App\Models\LearningPathEnrollment;
use App\Models\User;
use App\Services\LearningPathProgressService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Modules\Certificate\Models\Certificate;
use Modules\Certificate\Models\CertificateTemplate;
use Modules\TrainingEvent\Models\AssessmentQuestion;
use Modules\TrainingEvent\Models\EventAssessment;
use Modules\TrainingEvent\Models\EventParticipant;
use Modules\TrainingEvent\Models\TrainingEvent;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class LearningPathContinuityTest extends TestCase
{
    use RefreshDatabase;

    public function test_completing_required_referenced_step_finishes_path_and_issues_certificate(): void
    {
        $user = User::factory()->create();
        $creator = User::factory()->create();

        $template = CertificateTemplate::query()->create([
            'created_by' => $creator->id,
            'name' => 'Template Kurikulum',
            'body_template' => '{{participant_name}}',
            'is_active' => true,
        ]);

        $path = LearningPath::query()->create([
            'title' => 'Kurikulum Service Test',
            'status' => 'published',
            'estimated_hours' => 1,
            'is_sequential' => true,
            'certificate_template_id' => $template->id,
            'created_by' => $creator->id,
        ]);

        $step = $path->steps()->create([
            'order' => 1,
            'title' => 'Materi Wajib',
            'type' => 'material',
            'reference_id' => 'material-ref-1',
            'is_required' => true,
            'estimated_minutes' => 10,
        ]);

        $enrollment = LearningPathEnrollment::query()->create([
            'learning_path_id' => $path->id,
            'user_id' => $user->id,
            'enrolled_at' => now(),
        ]);

        app(LearningPathProgressService::class)->completeReferencedSteps('material', 'material-ref-1', $user->id);

        $this->assertDatabaseHas('learning_path_step_progress', [
            'enrollment_id' => $enrollment->id,
            'step_id' => $step->id,
        ]);

        $this->assertNotNull($enrollment->fresh()->completed_at);

        $certificate = Certificate::query()
            ->where('learning_path_id', $path->id)
            ->where('user_id', $user->id)
            ->first();

        $this->assertNotNull($certificate);
        $this->assertSame($template->id, $certificate->certificate_template_id);
        $this->assertStringStartsWith('CERT-LP-', $certificate->certificate_number);
    }

    public function test_published_learning_path_requires_steps(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole(Role::findOrCreate('super-admin'));
        Sanctum::actingAs($admin);

        $path = LearningPath::query()->create([
            'title' => 'Kurikulum Kosong',
            'status' => 'draft',
            'estimated_hours' => 1,
            'is_sequential' => true,
            'created_by' => $admin->id,
        ]);

        $this->putJson("/api/admin/learning-paths/{$path->uuid}", [
            'status' => 'published',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('status');
    }

    public function test_assessment_submit_returns_success_even_when_queue_backend_is_unavailable(): void
    {
        config([
            'queue.default' => 'redis',
            'database.redis.default.host' => '127.0.0.1',
            'database.redis.default.port' => 6399,
        ]);

        $participant = User::factory()->create();
        $participant->givePermissionTo(Permission::findOrCreate('view training event'));
        Sanctum::actingAs($participant);

        $creator = User::factory()->create();
        $template = CertificateTemplate::query()->create([
            'created_by' => $creator->id,
            'name' => 'Template Kuis',
            'body_template' => '{{participant_name}}',
            'is_active' => true,
        ]);

        $event = TrainingEvent::query()->create([
            'title' => 'Event Kuis',
            'start_date' => now(),
            'end_date' => now()->addDay(),
            'status' => 'active',
        ]);

        EventParticipant::query()->create([
            'training_event_id' => $event->id,
            'user_id' => $participant->id,
            'status' => 'enrolled',
            'completion_status' => 'pending',
            'enrolled_at' => now(),
        ]);

        $assessment = EventAssessment::query()->create([
            'training_event_id' => $event->id,
            'type' => 'post_test',
            'title' => 'Kuis Redis Fallback',
            'passing_score' => 70,
            'status' => 'published',
        ]);

        $question = AssessmentQuestion::query()->create([
            'event_assessment_id' => $assessment->id,
            'question' => 'Jawaban benar?',
            'type' => 'multiple_choice',
            'options' => ['A', 'B'],
            'correct_answer' => 'A',
            'points' => 1,
            'order' => 1,
        ]);

        $path = LearningPath::query()->create([
            'title' => 'Kurikulum Kuis',
            'status' => 'published',
            'estimated_hours' => 1,
            'is_sequential' => true,
            'certificate_template_id' => $template->id,
            'created_by' => $creator->id,
        ]);

        $path->steps()->create([
            'order' => 1,
            'title' => 'Kerjakan Kuis',
            'type' => 'quiz',
            'reference_id' => (string) $assessment->id,
            'is_required' => true,
            'estimated_minutes' => 10,
        ]);

        LearningPathEnrollment::query()->create([
            'learning_path_id' => $path->id,
            'user_id' => $participant->id,
            'enrolled_at' => now(),
        ]);

        $this->postJson("/api/training-events/{$event->uuid}/learn/assessments/{$assessment->id}/submit", [
            'answers' => [(string) $question->id => 'A'],
            'question_ids' => [$question->id],
        ])->assertCreated()
            ->assertJsonPath('data.score', 100)
            ->assertJsonPath('data.is_passed', true);

        $this->assertDatabaseHas('assessment_submissions', [
            'event_assessment_id' => $assessment->id,
            'user_id' => $participant->id,
            'score' => 100,
            'is_passed' => true,
        ]);

        $this->assertDatabaseHas('certificates', [
            'user_id' => $participant->id,
            'learning_path_id' => $path->id,
            'certificate_template_id' => $template->id,
        ]);
    }
}
