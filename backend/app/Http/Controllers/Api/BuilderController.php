<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\OracleService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class BuilderController extends Controller
{
    public function __construct(private OracleService $oracle) {}

    /** GET /api/v1/builder/setups — list all setups */
    public function listSetups(Request $request): JsonResponse
    {
        $customerId = $request->query('customer_id');
        $sql = "SELECT asu.setup_id, asu.setup_name, asu.water_type, asu.status,
                       asu.target_temp_c, asu.target_ph,
                       t.volume_liters, p.product_name AS tank_name,
                       TO_CHAR(asu.created_at,'YYYY-MM-DD') AS created_at
                FROM aquarium_setups asu
                JOIN tanks    t ON asu.tank_id   = t.tank_id
                JOIN products p ON t.product_id  = p.product_id";

        $bindings = [];
        if ($customerId) {
            $sql .= " WHERE asu.customer_id = :cid";
            $bindings[':cid'] = $customerId;
        }
        $sql .= " ORDER BY asu.created_at DESC";

        return response()->json($this->oracle->query($sql, $bindings));
    }

    /** GET /api/v1/builder/setup/{id} — get setup with items */
    public function getSetup(int $id): JsonResponse
    {
        $setup = $this->oracle->query(
            "SELECT asu.*, p.product_name AS tank_name, t.volume_liters
             FROM aquarium_setups asu
             JOIN tanks t ON asu.tank_id = t.tank_id
             JOIN products p ON t.product_id = p.product_id
             WHERE asu.setup_id = :sid",
            [':sid' => $id]
        );

        if (empty($setup)) {
            return response()->json(['error' => 'Setup not found'], 404);
        }

        $items = $this->oracle->query(
            "SELECT si.setup_item_id, si.item_type, si.quantity, si.notes,
                    p.product_id, p.product_name, p.unit_price, p.image_url
             FROM setup_items si
             JOIN products p ON si.product_id = p.product_id
             WHERE si.setup_id = :sid
             ORDER BY si.item_type, p.product_name",
            [':sid' => $id]
        );

        return response()->json([
            'setup' => $setup[0],
            'items' => $items,
        ]);
    }

    /** POST /api/v1/builder/setup — create new aquarium setup */
    public function createSetup(Request $request): JsonResponse
    {
        $data = $request->validate([
            'customer_id' => 'required|integer',
            'tank_id'     => 'required|integer',
            'setup_name'  => 'required|string|max:150',
            'water_type'  => 'required|in:FRESHWATER,SALTWATER,BRACKISH',
            'target_temp' => 'nullable|numeric|min:0|max:40',
            'target_ph'   => 'nullable|numeric|min:0|max:14',
            'description' => 'nullable|string|max:500',
        ]);

        try {
            $setupId = $this->oracle->createSetup(
                $data['customer_id'], $data['tank_id'], $data['setup_name'],
                $data['water_type'],  $data['target_temp'] ?? null,
                $data['target_ph']   ?? null, $data['description'] ?? null
            );
            return response()->json(['setup_id' => $setupId, 'message' => 'Setup created'], 201);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }

    /** POST /api/v1/builder/setup/{id}/item — add item to setup */
    public function addItem(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'product_id' => 'required|integer',
            'item_type'  => 'required|in:FISH,PLANT,EQUIPMENT,DECORATION',
            'quantity'   => 'nullable|integer|min:1',
            'notes'      => 'nullable|string|max:500',
        ]);

        try {
            $this->oracle->addItemToSetup(
                $id, $data['product_id'],
                $data['item_type'], $data['quantity'] ?? 1
            );
            return response()->json(['message' => 'Item added to setup']);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }

    /** DELETE /api/v1/builder/setup/{id}/item/{pid} — remove item */
    public function removeItem(int $id, int $pid): JsonResponse
    {
        try {
            DB::connection('oracle')->statement(
                "DELETE FROM setup_items WHERE setup_id = :sid AND product_id = :pid",
                ['sid' => $id, 'pid' => $pid]
            );
            return response()->json(['message' => 'Item removed']);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }

    /** GET /api/v1/builder/setup/{id}/validate — run all validation functions */
    public function validate(int $id): JsonResponse
    {
        try {
            $result = $this->oracle->validateSetup($id);
            return response()->json($result);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }

    /** GET /api/v1/builder/setup/{id}/price — get total estimated price */
    public function price(int $id): JsonResponse
    {
        $price = $this->oracle->getSetupPrice($id);
        return response()->json(['setup_id' => $id, 'total_price' => $price]);
    }

    /** POST /api/v1/builder/setup/{id}/save — save and finalize setup */
    public function saveSetup(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'customer_id' => 'required|integer',
            'share_code'  => 'nullable|string|max:20',
            'is_public'   => 'nullable|boolean',
        ]);

        try {
            $savedId = $this->oracle->saveSetup(
                $id, $data['customer_id'],
                $data['share_code'] ?? null,
                $data['is_public']  ? 1 : 0
            );
            return response()->json(['saved_id' => $savedId, 'message' => 'Setup saved']);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }

    /** GET /api/v1/builder/compatibility — list all rules */
    public function compatibilityRules(): JsonResponse
    {
        $rules = $this->oracle->query(
            "SELECT cr.rule_id, pa.product_name AS product_a, pb.product_name AS product_b,
                    cr.rule_type, cr.severity, cr.reason, cr.created_at
             FROM compatibility_rules cr
             JOIN products pa ON cr.product_id_a = pa.product_id
             JOIN products pb ON cr.product_id_b = pb.product_id
             ORDER BY cr.severity DESC, cr.created_at DESC"
        );
        return response()->json($rules);
    }

    /** POST /api/v1/builder/compatibility — add new rule */
    public function addCompatibilityRule(Request $request): JsonResponse
    {
        $data = $request->validate([
            'product_id_a' => 'required|integer',
            'product_id_b' => 'required|integer|different:product_id_a',
            'rule_type'    => 'required|in:INCOMPATIBLE,REQUIRES,NEUTRAL',
            'severity'     => 'required|in:WARNING,ERROR',
            'reason'       => 'nullable|string|max:500',
            'created_by'   => 'nullable|integer',
        ]);

        try {
            DB::connection('oracle')->statement(
                "INSERT INTO compatibility_rules
                    (product_id_a, product_id_b, rule_type, severity, reason, created_by)
                 VALUES (:pa, :pb, :rtype, :sev, :reason, :uid)",
                [
                    'pa'     => $data['product_id_a'],
                    'pb'     => $data['product_id_b'],
                    'rtype'  => $data['rule_type'],
                    'sev'    => $data['severity'],
                    'reason' => $data['reason'] ?? null,
                    'uid'    => $data['created_by'] ?? null,
                ]
            );
            return response()->json(['message' => 'Compatibility rule added'], 201);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }
}
