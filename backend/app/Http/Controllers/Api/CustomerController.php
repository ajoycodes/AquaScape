<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\OracleService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class CustomerController extends Controller
{
    public function __construct(private OracleService $oracle) {}

    public function index(Request $request): JsonResponse
    {
        $search = $request->query('search');
        $sql = "SELECT c.*, COUNT(o.order_id) AS order_count,
                       NVL(SUM(o.total_amount),0) AS lifetime_value
                FROM customers c
                LEFT JOIN orders o ON c.customer_id = o.customer_id
                    AND o.order_status NOT IN ('CANCELLED','REFUNDED')
                WHERE c.is_active = 1";
        $b = [];

        if ($search) {
            $sql .= " AND (UPPER(c.first_name || ' ' || c.last_name) LIKE UPPER(:s)
                          OR UPPER(c.email) LIKE UPPER(:s2))";
            $b[':s']  = '%' . $search . '%';
            $b[':s2'] = '%' . $search . '%';
        }

        $sql .= " GROUP BY c.customer_id, c.first_name, c.last_name, c.email,
                           c.phone, c.address, c.city, c.country, c.is_active, c.created_at
                  ORDER BY lifetime_value DESC";

        return response()->json($this->oracle->query($sql, $b));
    }

    public function show(int $id): JsonResponse
    {
        $rows = $this->oracle->query(
            "SELECT * FROM vw_customer_purchase_history WHERE customer_id = :id",
            [':id' => $id]
        );
        return empty($rows)
            ? response()->json(['error' => 'Customer not found'], 404)
            : response()->json($rows[0]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'first_name' => 'required|string|max:60',
            'last_name'  => 'required|string|max:60',
            'email'      => 'required|email|max:100',
            'phone'      => 'nullable|string|max:20',
            'address'    => 'nullable|string|max:500',
            'city'       => 'nullable|string|max:80',
            'country'    => 'nullable|string|max:60',
        ]);

        try {
            DB::connection('oracle')->statement(
                "INSERT INTO customers (first_name,last_name,email,phone,address,city,country)
                 VALUES (:fn,:ln,:email,:phone,:addr,:city,:country)",
                [
                    'fn'      => $data['first_name'],
                    'ln'      => $data['last_name'],
                    'email'   => $data['email'],
                    'phone'   => $data['phone']   ?? null,
                    'addr'    => $data['address']  ?? null,
                    'city'    => $data['city']     ?? null,
                    'country' => $data['country']  ?? 'Malaysia',
                ]
            );

            // Create empty cart
            DB::connection('oracle')->statement(
                "INSERT INTO cart (customer_id)
                 SELECT customer_id FROM customers WHERE email = :email",
                ['email' => $data['email']]
            );

            return response()->json(['message' => 'Customer created'], 201);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'first_name' => 'sometimes|string|max:60',
            'last_name'  => 'sometimes|string|max:60',
            'phone'      => 'nullable|string|max:20',
            'address'    => 'nullable|string|max:500',
            'city'       => 'nullable|string|max:80',
        ]);

        DB::connection('oracle')->statement(
            "UPDATE customers SET
                first_name = NVL(:fn,  first_name),
                last_name  = NVL(:ln,  last_name),
                phone      = NVL(:ph,  phone),
                address    = NVL(:addr,address),
                city       = NVL(:city,city)
             WHERE customer_id = :id",
            [
                'fn'   => $data['first_name'] ?? null,
                'ln'   => $data['last_name']  ?? null,
                'ph'   => $data['phone']       ?? null,
                'addr' => $data['address']     ?? null,
                'city' => $data['city']        ?? null,
                'id'   => $id,
            ]
        );
        return response()->json(['message' => 'Customer updated']);
    }
}
