<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\OracleService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class SupplierController extends Controller
{
    public function __construct(private OracleService $oracle) {}

    public function index(): JsonResponse
    {
        return response()->json($this->oracle->query(
            "SELECT * FROM suppliers WHERE is_active = 1 ORDER BY supplier_name"
        ));
    }

    public function show(int $id): JsonResponse
    {
        $rows = $this->oracle->query(
            "SELECT * FROM suppliers WHERE supplier_id = :id",
            [':id' => $id]
        );
        return empty($rows)
            ? response()->json(['error' => 'Not found'], 404)
            : response()->json($rows[0]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'supplier_name' => 'required|string|max:150',
            'contact_name'  => 'nullable|string|max:100',
            'email'         => 'nullable|email|max:100',
            'phone'         => 'nullable|string|max:20',
            'address'       => 'nullable|string|max:500',
            'country'       => 'nullable|string|max:60',
            'payment_terms' => 'nullable|string|max:100',
        ]);

        try {
            DB::connection('oracle')->statement(
                "INSERT INTO suppliers (supplier_name,contact_name,email,phone,address,country,payment_terms)
                 VALUES (:name,:contact,:email,:phone,:addr,:country,:terms)",
                [
                    'name'    => $data['supplier_name'],
                    'contact' => $data['contact_name']  ?? null,
                    'email'   => $data['email']          ?? null,
                    'phone'   => $data['phone']          ?? null,
                    'addr'    => $data['address']        ?? null,
                    'country' => $data['country']        ?? null,
                    'terms'   => $data['payment_terms']  ?? null,
                ]
            );
            return response()->json(['message' => 'Supplier created'], 201);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'supplier_name' => 'sometimes|string|max:150',
            'contact_name'  => 'nullable|string|max:100',
            'email'         => 'nullable|email|max:100',
            'phone'         => 'nullable|string|max:20',
            'is_active'     => 'nullable|boolean',
        ]);

        try {
            DB::connection('oracle')->statement(
                "UPDATE suppliers SET
                    supplier_name = NVL(:name, supplier_name),
                    contact_name  = NVL(:contact, contact_name),
                    email         = NVL(:email, email),
                    phone         = NVL(:phone, phone),
                    is_active     = NVL(:active, is_active)
                 WHERE supplier_id = :id",
                [
                    'name'    => $data['supplier_name'] ?? null,
                    'contact' => $data['contact_name']  ?? null,
                    'email'   => $data['email']          ?? null,
                    'phone'   => $data['phone']          ?? null,
                    'active'  => isset($data['is_active']) ? (int)$data['is_active'] : null,
                    'id'      => $id,
                ]
            );
            return response()->json(['message' => 'Supplier updated']);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }

    // ── Purchase Orders ───────────────────────────────────────────────────

    public function listPOs(Request $request): JsonResponse
    {
        $status = $request->query('status');
        $sql    = "SELECT spo.po_id, spo.po_date, spo.po_status, spo.total_amount,
                          s.supplier_name, u.username AS created_by,
                          spo.expected_date, spo.received_date
                   FROM supplier_po spo
                   JOIN suppliers s ON spo.supplier_id = s.supplier_id
                   JOIN users u ON spo.created_by = u.user_id";
        $b = [];

        if ($status) {
            $sql .= " WHERE spo.po_status = :status";
            $b[':status'] = strtoupper($status);
        }
        $sql .= " ORDER BY spo.po_date DESC";

        return response()->json($this->oracle->query($sql, $b));
    }

    public function showPO(int $id): JsonResponse
    {
        $po    = $this->oracle->query("SELECT * FROM supplier_po WHERE po_id = :id", [':id' => $id]);
        $items = $this->oracle->query(
            "SELECT spoi.*, p.product_name FROM supplier_po_items spoi
             JOIN products p ON spoi.product_id = p.product_id WHERE spoi.po_id = :id",
            [':id' => $id]
        );
        return empty($po)
            ? response()->json(['error' => 'PO not found'], 404)
            : response()->json(['po' => $po[0], 'items' => $items]);
    }

    public function createPO(Request $request): JsonResponse
    {
        $data = $request->validate([
            'supplier_id'   => 'required|integer',
            'user_id'       => 'required|integer',
            'expected_date' => 'nullable|date',
            'notes'         => 'nullable|string|max:1000',
        ]);

        try {
            $poId = $this->oracle->createPO(
                $data['supplier_id'], $data['user_id'],
                $data['expected_date'] ?? null, $data['notes'] ?? null
            );
            return response()->json(['po_id' => $poId, 'message' => 'PO created'], 201);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }

    public function addPOItem(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'product_id' => 'required|integer',
            'quantity'   => 'required|integer|min:1',
            'unit_cost'  => 'required|numeric|min:0',
        ]);

        try {
            $stmt = DB::connection('oracle')->getPdo()->prepare(
                "BEGIN add_po_item(:poid,:pid,:qty,:cost); END;"
            );
            $stmt->bindValue(':poid', $id,                \PDO::PARAM_INT);
            $stmt->bindValue(':pid',  $data['product_id'],\PDO::PARAM_INT);
            $stmt->bindValue(':qty',  $data['quantity'],  \PDO::PARAM_INT);
            $stmt->bindValue(':cost', $data['unit_cost'], \PDO::PARAM_STR);
            $stmt->execute();
            return response()->json(['message' => 'PO item added']);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }

    public function submitPO(Request $request, int $id): JsonResponse
    {
        $data = $request->validate(['user_id' => 'required|integer']);
        try {
            $stmt = DB::connection('oracle')->getPdo()->prepare(
                "BEGIN submit_supplier_po(:poid,:uid); END;"
            );
            $stmt->bindValue(':poid', $id,            \PDO::PARAM_INT);
            $stmt->bindValue(':uid',  $data['user_id'],\PDO::PARAM_INT);
            $stmt->execute();
            return response()->json(['message' => 'PO submitted']);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }

    public function approvePO(Request $request, int $id): JsonResponse
    {
        $data = $request->validate(['user_id' => 'required|integer']);
        try {
            $this->oracle->approvePO($id, $data['user_id']);
            return response()->json(['message' => 'PO approved']);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }

    public function receivePO(Request $request, int $id): JsonResponse
    {
        $data = $request->validate(['user_id' => 'required|integer']);
        try {
            $this->oracle->receivePO($id, $data['user_id']);
            return response()->json(['message' => 'PO received — stock updated']);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }
}
