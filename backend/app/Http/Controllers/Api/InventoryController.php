<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\OracleService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class InventoryController extends Controller
{
    public function __construct(private OracleService $oracle) {}

    public function index(): JsonResponse
    {
        return response()->json(
            $this->oracle->query("SELECT * FROM vw_inventory_summary ORDER BY product_name")
        );
    }

    public function lowStock(): JsonResponse
    {
        return response()->json($this->oracle->query("SELECT * FROM vw_low_stock"));
    }

    public function alerts(): JsonResponse
    {
        return response()->json($this->oracle->query(
            "SELECT la.*, p.product_name FROM low_stock_alerts la
             JOIN products p ON la.product_id = p.product_id
             WHERE la.is_resolved = 0 ORDER BY la.alert_date DESC"
        ));
    }

    public function resolveAlert(Request $request, int $id): JsonResponse
    {
        $data = $request->validate(['user_id' => 'required|integer']);
        DB::connection('oracle')->statement(
            "UPDATE low_stock_alerts
             SET is_resolved = 1, resolved_at = SYSDATE, resolved_by = :uid
             WHERE alert_id = :id",
            ['uid' => $data['user_id'], 'id' => $id]
        );
        return response()->json(['message' => 'Alert resolved']);
    }

    public function adjust(Request $request): JsonResponse
    {
        $data = $request->validate([
            'product_id' => 'required|integer',
            'delta'      => 'required|integer',
            'move_type'  => 'required|in:ADJUSTMENT,DAMAGE',
            'user_id'    => 'required|integer',
            'notes'      => 'nullable|string|max:500',
        ]);

        try {
            $this->oracle->adjustInventory(
                $data['product_id'], $data['delta'],
                $data['move_type'],  $data['user_id'],
                $data['notes'] ?? null
            );
            return response()->json(['message' => 'Inventory adjusted']);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }

    public function movements(Request $request): JsonResponse
    {
        $productId = $request->query('product_id');
        $limit     = $request->query('limit', 100);
        $sql       = "SELECT * FROM vw_stock_movement_log";
        $b         = [];

        if ($productId) {
            $sql .= " WHERE product_id = :pid";
            $b[':pid'] = $productId;
        }
        $sql  = "SELECT * FROM ({$sql}) WHERE ROWNUM <= :lim";
        $b[':lim'] = $limit;

        return response()->json($this->oracle->query($sql, $b));
    }
}
