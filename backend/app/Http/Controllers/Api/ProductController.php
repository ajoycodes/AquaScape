<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\OracleService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class ProductController extends Controller
{
    public function __construct(private OracleService $oracle) {}

    public function index(Request $request): JsonResponse
    {
        $type       = $request->query('type');
        $category   = $request->query('category_id');
        $search     = $request->query('search');
        $limit      = $request->query('limit', 50);

        $sql = "SELECT p.product_id, p.product_name, p.product_type, p.sku,
                       p.unit_price, p.cost_price, p.description, p.image_url,
                       c.category_name,
                       NVL(i.qty_on_hand, 0) AS qty_on_hand,
                       NVL(i.qty_reserved, 0) AS qty_reserved,
                       (NVL(i.qty_on_hand,0) - NVL(i.qty_reserved,0)) AS qty_available
                FROM products p
                JOIN categories c ON p.category_id = c.category_id
                LEFT JOIN inventory i ON i.product_id = p.product_id
                WHERE p.is_active = 1";
        $b = [];

        if ($type) {
            $sql .= " AND p.product_type = :type";
            $b[':type'] = strtoupper($type);
        }
        if ($category) {
            $sql .= " AND p.category_id = :cat";
            $b[':cat'] = $category;
        }
        if ($search) {
            $sql .= " AND UPPER(p.product_name) LIKE UPPER(:search)";
            $b[':search'] = '%' . $search . '%';
        }

        $sql  = "SELECT * FROM ({$sql} ORDER BY p.product_name) WHERE ROWNUM <= :lim";
        $b[':lim'] = $limit;

        return response()->json($this->oracle->query($sql, $b));
    }

    public function show(int $id): JsonResponse
    {
        $rows = $this->oracle->query(
            "SELECT p.*, c.category_name, NVL(i.qty_on_hand,0) AS qty_on_hand
             FROM products p
             JOIN categories c ON p.category_id = c.category_id
             LEFT JOIN inventory i ON i.product_id = p.product_id
             WHERE p.product_id = :id",
            [':id' => $id]
        );
        return empty($rows)
            ? response()->json(['error' => 'Product not found'], 404)
            : response()->json($rows[0]);
    }

    public function byType(string $type): JsonResponse
    {
        $validTypes = ['FISH','PLANT','TANK','EQUIPMENT','DECORATION'];
        if (!in_array(strtoupper($type), $validTypes)) {
            return response()->json(['error' => 'Invalid product type'], 400);
        }

        $rows = $this->oracle->query(
            "SELECT p.product_id, p.product_name, p.unit_price, p.image_url,
                    NVL(i.qty_on_hand,0) AS qty_on_hand
             FROM products p
             LEFT JOIN inventory i ON i.product_id = p.product_id
             WHERE p.product_type = :type AND p.is_active = 1
             ORDER BY p.product_name",
            [':type' => strtoupper($type)]
        );
        return response()->json($rows);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'category_id'  => 'required|integer',
            'product_name' => 'required|string|max:150',
            'product_type' => 'required|in:FISH,PLANT,TANK,EQUIPMENT,DECORATION',
            'sku'          => 'nullable|string|max:50',
            'unit_price'   => 'required|numeric|min:0',
            'cost_price'   => 'nullable|numeric|min:0',
            'description'  => 'nullable|string|max:1000',
            'reorder_level'=> 'nullable|integer|min:0',
            'reorder_qty'  => 'nullable|integer|min:1',
        ]);

        try {
            $pdo  = DB::connection('oracle')->getPdo();
            $stmt = $pdo->prepare(
                "INSERT INTO products
                    (category_id, product_name, product_type, sku, unit_price, cost_price, description)
                 VALUES (:cid,:name,:type,:sku,:price,:cost,:desc)
                 RETURNING product_id INTO :pid"
            );
            $productId = null;
            $stmt->bindValue(':cid',  $data['category_id'],  \PDO::PARAM_INT);
            $stmt->bindValue(':name', $data['product_name'],  \PDO::PARAM_STR);
            $stmt->bindValue(':type', $data['product_type'],  \PDO::PARAM_STR);
            $stmt->bindValue(':sku',  $data['sku'] ?? null,   \PDO::PARAM_STR);
            $stmt->bindValue(':price',$data['unit_price'],    \PDO::PARAM_STR);
            $stmt->bindValue(':cost', $data['cost_price'] ?? null, \PDO::PARAM_STR);
            $stmt->bindValue(':desc', $data['description'] ?? null, \PDO::PARAM_STR);
            $stmt->bindParam(':pid',  $productId, \PDO::PARAM_INT | \PDO::PARAM_INPUT_OUTPUT, 10);
            $stmt->execute();

            // Create inventory record
            DB::connection('oracle')->statement(
                "BEGIN add_product_to_inventory(:pid, 0, :rl, :rq); END;",
                [
                    'pid' => $productId,
                    'rl'  => $data['reorder_level'] ?? 10,
                    'rq'  => $data['reorder_qty']   ?? 50,
                ]
            );

            return response()->json(['product_id' => $productId, 'message' => 'Product created'], 201);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'product_name' => 'sometimes|string|max:150',
            'unit_price'   => 'sometimes|numeric|min:0',
            'cost_price'   => 'nullable|numeric|min:0',
            'description'  => 'nullable|string|max:1000',
            'is_active'    => 'nullable|boolean',
        ]);

        try {
            DB::connection('oracle')->statement(
                "UPDATE products SET
                    product_name = NVL(:name, product_name),
                    unit_price   = NVL(:price, unit_price),
                    cost_price   = NVL(:cost, cost_price),
                    description  = NVL(:desc, description),
                    is_active    = NVL(:active, is_active)
                 WHERE product_id = :id",
                [
                    'name'  => $data['product_name'] ?? null,
                    'price' => $data['unit_price']   ?? null,
                    'cost'  => $data['cost_price']   ?? null,
                    'desc'  => $data['description']  ?? null,
                    'active'=> isset($data['is_active']) ? (int)$data['is_active'] : null,
                    'id'    => $id,
                ]
            );
            return response()->json(['message' => 'Product updated']);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }

    public function destroy(int $id): JsonResponse
    {
        // Soft delete only
        DB::connection('oracle')->statement(
            "UPDATE products SET is_active = 0 WHERE product_id = :id",
            ['id' => $id]
        );
        return response()->json(['message' => 'Product deactivated']);
    }
}
