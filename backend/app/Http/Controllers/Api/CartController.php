<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\OracleService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class CartController extends Controller
{
    public function __construct(private OracleService $oracle) {}

    public function index(int $customerId): JsonResponse
    {
        $items = $this->oracle->query(
            "SELECT ci.cart_item_id, ci.product_id, ci.quantity,
                    p.product_name, p.product_type, p.unit_price, p.image_url,
                    (ci.quantity * p.unit_price) AS line_total,
                    NVL(i.qty_on_hand,0) AS stock_available
             FROM cart_items ci
             JOIN cart     c  ON ci.cart_id    = c.cart_id
             JOIN products p  ON ci.product_id = p.product_id
             LEFT JOIN inventory i ON i.product_id = p.product_id
             WHERE c.customer_id = :cid
             ORDER BY p.product_name",
            [':cid' => $customerId]
        );

        $total = array_sum(array_column($items, 'LINE_TOTAL'));

        return response()->json(['items' => $items, 'subtotal' => round($total, 2)]);
    }

    public function addItem(Request $request, int $customerId): JsonResponse
    {
        $data = $request->validate([
            'product_id' => 'required|integer',
            'quantity'   => 'required|integer|min:1',
        ]);

        try {
            // Ensure cart exists
            DB::connection('oracle')->statement(
                "MERGE INTO cart c USING DUAL ON (c.customer_id = :cid)
                 WHEN NOT MATCHED THEN INSERT (customer_id) VALUES (:cid2)",
                ['cid' => $customerId, 'cid2' => $customerId]
            );

            // Upsert cart item
            DB::connection('oracle')->statement(
                "MERGE INTO cart_items ci
                 USING (SELECT cart_id FROM cart WHERE customer_id = :cid) c
                 ON (ci.cart_id = c.cart_id AND ci.product_id = :pid)
                 WHEN MATCHED THEN UPDATE SET ci.quantity = ci.quantity + :qty
                 WHEN NOT MATCHED THEN INSERT (cart_id, product_id, quantity)
                     VALUES (c.cart_id, :pid2, :qty2)",
                [
                    'cid'  => $customerId,
                    'pid'  => $data['product_id'],
                    'qty'  => $data['quantity'],
                    'pid2' => $data['product_id'],
                    'qty2' => $data['quantity'],
                ]
            );
            return response()->json(['message' => 'Item added to cart']);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }

    public function updateItem(Request $request, int $customerId, int $productId): JsonResponse
    {
        $data = $request->validate(['quantity' => 'required|integer|min:1']);

        DB::connection('oracle')->statement(
            "UPDATE cart_items ci
             SET ci.quantity = :qty
             WHERE ci.product_id = :pid
               AND ci.cart_id = (SELECT cart_id FROM cart WHERE customer_id = :cid)",
            ['qty' => $data['quantity'], 'pid' => $productId, 'cid' => $customerId]
        );
        return response()->json(['message' => 'Cart item updated']);
    }

    public function removeItem(int $customerId, int $productId): JsonResponse
    {
        DB::connection('oracle')->statement(
            "DELETE FROM cart_items
             WHERE product_id = :pid
               AND cart_id = (SELECT cart_id FROM cart WHERE customer_id = :cid)",
            ['pid' => $productId, 'cid' => $customerId]
        );
        return response()->json(['message' => 'Item removed from cart']);
    }

    public function clear(int $customerId): JsonResponse
    {
        DB::connection('oracle')->statement(
            "DELETE FROM cart_items WHERE cart_id = (SELECT cart_id FROM cart WHERE customer_id = :cid)",
            ['cid' => $customerId]
        );
        return response()->json(['message' => 'Cart cleared']);
    }
}
