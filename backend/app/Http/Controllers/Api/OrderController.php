<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\OracleService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class OrderController extends Controller
{
    public function __construct(private OracleService $oracle) {}

    /** GET /api/v1/orders */
    public function index(Request $request): JsonResponse
    {
        $status     = $request->query('status');
        $customerId = $request->query('customer_id');
        $limit      = $request->query('limit', 50);

        $sql = "SELECT o.order_id, o.order_date, o.order_status,
                       c.first_name || ' ' || c.last_name AS customer_name,
                       o.subtotal, o.discount_total, o.tax_amount, o.total_amount,
                       o.shipping_addr
                FROM orders o
                JOIN customers c ON o.customer_id = c.customer_id
                WHERE 1=1";
        $bindings = [];

        if ($status) {
            $sql .= " AND o.order_status = :status";
            $bindings[':status'] = strtoupper($status);
        }
        if ($customerId) {
            $sql .= " AND o.customer_id = :cid";
            $bindings[':cid'] = $customerId;
        }

        $sql .= " ORDER BY o.order_date DESC";
        $sql  = "SELECT * FROM ({$sql}) WHERE ROWNUM <= :lim";
        $bindings[':lim'] = $limit;

        return response()->json($this->oracle->query($sql, $bindings));
    }

    /** GET /api/v1/orders/{id} */
    public function show(int $id): JsonResponse
    {
        $order = $this->oracle->query(
            "SELECT o.*, c.first_name || ' ' || c.last_name AS customer_name
             FROM orders o JOIN customers c ON o.customer_id = c.customer_id
             WHERE o.order_id = :oid",
            [':oid' => $id]
        );

        if (empty($order)) {
            return response()->json(['error' => 'Order not found'], 404);
        }

        $items = $this->oracle->query(
            "SELECT oi.*, p.product_name, p.product_type
             FROM order_items oi JOIN products p ON oi.product_id = p.product_id
             WHERE oi.order_id = :oid",
            [':oid' => $id]
        );

        $payment = $this->oracle->query(
            "SELECT * FROM payments WHERE order_id = :oid ORDER BY payment_date DESC",
            [':oid' => $id]
        );

        return response()->json([
            'order'   => $order[0],
            'items'   => $items,
            'payments'=> $payment,
        ]);
    }

    /** POST /api/v1/orders/place */
    public function placeOrder(Request $request): JsonResponse
    {
        $data = $request->validate([
            'customer_id'   => 'required|integer',
            'shipping_addr' => 'required|string|max:500',
            'setup_id'      => 'nullable|integer',
            'discount_code' => 'nullable|string|max:50',
        ]);

        try {
            $orderId = $this->oracle->placeOrder(
                $data['customer_id'],
                $data['shipping_addr'],
                $data['setup_id']      ?? null,
                $data['discount_code'] ?? null
            );
            return response()->json(['order_id' => $orderId, 'status' => 'CONFIRMED'], 201);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }

    /** PUT /api/v1/orders/{id}/status */
    public function updateStatus(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'status'  => 'required|in:CONFIRMED,PROCESSING,SHIPPED,DELIVERED',
            'user_id' => 'required|integer',
        ]);

        try {
            $this->oracle->updateOrderStatus($id, $data['status'], $data['user_id']);
            return response()->json(['message' => 'Status updated to ' . $data['status']]);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }

    /** POST /api/v1/orders/{id}/cancel */
    public function cancel(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'user_id' => 'required|integer',
            'reason'  => 'nullable|string|max:500',
        ]);

        try {
            $this->oracle->cancelOrder($id, $data['user_id'], $data['reason'] ?? null);
            return response()->json(['message' => 'Order ' . $id . ' cancelled']);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }

    /** POST /api/v1/orders/returns */
    public function createReturn(Request $request): JsonResponse
    {
        $data = $request->validate([
            'order_id'     => 'required|integer',
            'customer_id'  => 'required|integer',
            'reason'       => 'nullable|string|max:500',
            'refund_amount'=> 'nullable|numeric|min:0',
            'items'        => 'required|array|min:1',
            'items.*.order_item_id' => 'required|integer',
            'items.*.quantity'      => 'required|integer|min:1',
            'items.*.condition'     => 'required|in:GOOD,DAMAGED,DEAD,OTHER',
        ]);

        try {
            $returnId = null;
            DB::connection('oracle')->statement(
                "INSERT INTO returns (order_id, customer_id, reason, refund_amount)
                 VALUES (:oid, :cid, :reason, :refund)
                 RETURNING return_id INTO :rid",
                // Note: RETURNING INTO requires raw PDO for OUT binding
            );

            // Use raw PDO for RETURNING INTO
            $pdo  = DB::connection('oracle')->getPdo();
            $stmt = $pdo->prepare(
                "INSERT INTO returns (order_id, customer_id, reason, refund_amount)
                 VALUES (:oid, :cid, :reason, :refund)
                 RETURNING return_id INTO :rid"
            );
            $stmt->bindValue(':oid',    $data['order_id'],       \PDO::PARAM_INT);
            $stmt->bindValue(':cid',    $data['customer_id'],     \PDO::PARAM_INT);
            $stmt->bindValue(':reason', $data['reason'] ?? null,  \PDO::PARAM_STR);
            $stmt->bindValue(':refund', $data['refund_amount'] ?? 0, \PDO::PARAM_STR);
            $stmt->bindParam(':rid',    $returnId, \PDO::PARAM_INT | \PDO::PARAM_INPUT_OUTPUT, 10);
            $stmt->execute();

            foreach ($data['items'] as $item) {
                DB::connection('oracle')->statement(
                    "INSERT INTO return_items (return_id, order_item_id, quantity, condition_code)
                     VALUES (:rid, :oiid, :qty, :cond)",
                    [
                        'rid'  => $returnId,
                        'oiid' => $item['order_item_id'],
                        'qty'  => $item['quantity'],
                        'cond' => $item['condition'],
                    ]
                );
            }

            return response()->json(['return_id' => $returnId, 'message' => 'Return request created'], 201);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }

    /** PUT /api/v1/orders/returns/{id} */
    public function processReturn(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'user_id' => 'required|integer',
            'approve' => 'required|boolean',
        ]);

        try {
            $this->oracle->processReturn($id, $data['user_id'], $data['approve']);
            $msg = $data['approve'] ? 'Return approved and refunded' : 'Return rejected';
            return response()->json(['message' => $msg]);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }
}
