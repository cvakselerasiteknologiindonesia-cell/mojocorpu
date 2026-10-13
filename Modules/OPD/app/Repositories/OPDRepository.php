<?php

namespace Modules\OPD\Repositories;

use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Modules\OPD\Models\OPD;

class OPDRepository
{
    public function stats(): array
    {
        $total = OPD::count();
        $active = OPD::where('is_active', true)->count();
        $withoutContact = OPD::where(function ($q) {
            $q->whereNull('email')
                ->orWhere('email', '')
                ->orWhereNull('phone')
                ->orWhere('phone', '');
        })->count();

        $totalAsn = DB::table('users')
            ->whereNotNull('opd_name')
            ->where('opd_name', '!=', '')
            ->count();

        $totalUnits = DB::table('users')
            ->whereNotNull('organization_unit_name')
            ->where('organization_unit_name', '!=', '')
            ->distinct('organization_unit_name')
            ->count('organization_unit_name');

        return [
            'total' => $total,
            'active' => $active,
            'inactive' => $total - $active,
            'total_asn' => $totalAsn,
            'total_units' => $totalUnits,
            'without_asn' => OPD::query()
                ->whereNotExists(fn ($q) => $q->selectRaw('1')
                    ->from('users')
                    ->whereColumn('users.opd_name', 'opds.name'))
                ->count(),
            'without_contact' => $withoutContact,
        ];
    }

    public function paginate(int $perPage = 15, array $filters = []): LengthAwarePaginator
    {
        return OPD::query()
            ->select([
                'opds.*',
                DB::raw('(SELECT COUNT(*) FROM users WHERE users.opd_name = opds.name) as asn_count'),
                DB::raw('(SELECT COUNT(DISTINCT users.organization_unit_name) FROM users WHERE users.opd_name = opds.name AND users.organization_unit_name IS NOT NULL AND users.organization_unit_name != \'\') as unit_count'),
            ])
            ->when(! empty($filters['search']), fn ($q) => $q->where(fn ($q2) => $q2->where('opds.name', 'like', '%'.$filters['search'].'%')
                ->orWhere('opds.code', 'like', '%'.$filters['search'].'%')
            ))
            ->orderBy('opds.name')
            ->paginate($perPage);
    }

    public function create(array $data): OPD
    {
        return OPD::query()->create($data);
    }

    public function upsertFromSso(array $records): int
    {
        $count = 0;
        foreach ($records as $rec) {
            OPD::query()->updateOrCreate(
                ['uuid' => $rec['uuid']],
                [
                    'code' => $rec['code'] ?? null,
                    'name' => $rec['name'],
                    'address' => $rec['address'] ?? null,
                    'phone' => $rec['phone'] ?? null,
                    'email' => $rec['email'] ?? null,
                    'is_active' => (bool) ($rec['is_active'] ?? true),
                ]
            );
            $count++;
        }

        return $count;
    }

    public function upsertFromSimpegSatker(array $records): int
    {
        $count = 0;

        foreach ($records as $rec) {
            $code = trim((string) ($rec['satker_id'] ?? ''));
            $name = trim((string) ($rec['nama'] ?? ''));

            if ($code === '' || $name === '') {
                continue;
            }

            OPD::query()->updateOrCreate(
                ['code' => $code],
                [
                    'name' => $name,
                    'address' => $rec['alamat'] ?? null,
                    'is_active' => true,
                ]
            );

            $count++;
        }

        return $count;
    }
}
