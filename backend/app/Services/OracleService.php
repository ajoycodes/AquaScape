<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use PDO;

/**
 * OracleService
 *
 * Central service for calling Oracle PL/SQL procedures and functions.
 * All methods return arrays that controllers convert to JSON responses.
 *
 * Pattern for procedures with OUT params:
 *   BEGIN proc_name(:in1, :in2, :out); END;
 *
 * Pattern for functions:
 *   BEGIN :result := fn_name(:in1, :in2); END;
 */
class OracleService
{
    protected PDO $pdo;

    public function __construct()
    {
        $this->pdo = DB::connection('oracle')->getPdo();
    }

    // ──────────────────────────────────────────────────────────────────────
    // GENERIC HELPERS
    // ──────────────────────────────────────────────────────────────────────

    /**
     * Execute a SELECT query and return all rows as array of assoc arrays.
     */
    public function query(string $sql, array $bindings = []): array
    {
        $stmt = $this->pdo->prepare($sql);
        foreach ($bindings as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Execute a procedure with IN params and a single OUT NUMBER param.
     * Returns the OUT value.
     */
    public function callProcedureWithOutId(string $plsql, array $inParams, string $outParam): ?int
    {
        $stmt = $this->pdo->prepare($plsql);

        foreach ($inParams as $key => [$value, $type]) {
            $stmt->bindValue($key, $value, $type);
        }

        $outValue = null;
        $stmt->bindParam($outParam, $outValue, PDO::PARAM_INT | PDO::PARAM_INPUT_OUTPUT, 10);
        $stmt->execute();

        return $outValue;
    }

    /**
     * Execute a PL/SQL anonymous block that returns a scalar NUMBER function result.
     */
    public function callFunction(string $plsql, array $inParams): mixed
    {
        $stmt   = $this->pdo->prepare($plsql);
        $result = null;

        $stmt->bindParam(':result', $result, PDO::PARAM_INT | PDO::PARAM_INPUT_OUTPUT, 20);
        foreach ($inParams as $key => [$value, $type]) {
            $stmt->bindValue($key, $value, $type);
        }
        $stmt->execute();

        return $result;
    }

    // ──────────────────────────────────────────────────────────────────────
    // BUILDER
    // ──────────────────────────────────────────────────────────────────────

    public function createSetup(int $customerId, int $tankId, string $name, string $waterType,
                                ?float $temp = null, ?float $ph = null, ?string $desc = null): int
    {
        return $this->callProcedureWithOutId(
            "BEGIN create_aquarium_setup(:cid,:tid,:name,:wt,:temp,:ph,:desc,:sid); END;",
            [
                ':cid'  => [$customerId,  PDO::PARAM_INT],
                ':tid'  => [$tankId,      PDO::PARAM_INT],
                ':name' => [$name,        PDO::PARAM_STR],
                ':wt'   => [$waterType,   PDO::PARAM_STR],
                ':temp' => [$temp,        PDO::PARAM_STR],
                ':ph'   => [$ph,          PDO::PARAM_STR],
                ':desc' => [$desc,        PDO::PARAM_STR],
            ],
            ':sid'
        );
    }

    public function addItemToSetup(int $setupId, int $productId, string $itemType, int $qty): void
    {
        $stmt = $this->pdo->prepare(
            "BEGIN add_item_to_setup(:sid,:pid,:type,:qty,NULL); END;"
        );
        $stmt->bindValue(':sid',  $setupId,   PDO::PARAM_INT);
        $stmt->bindValue(':pid',  $productId, PDO::PARAM_INT);
        $stmt->bindValue(':type', $itemType,  PDO::PARAM_STR);
        $stmt->bindValue(':qty',  $qty,       PDO::PARAM_INT);
        $stmt->execute();
    }

    public function validateSetup(int $setupId): array
    {
        $capacity = $this->callFunction(
            "BEGIN :result := validate_tank_capacity(:sid); END;",
            [':sid' => [$setupId, PDO::PARAM_INT]]
        );
        $waterOk = $this->callFunction(
            "BEGIN :result := validate_water_type(:sid); END;",
            [':sid' => [$setupId, PDO::PARAM_INT]]
        );
        $tempOk = $this->callFunction(
            "BEGIN :result := validate_temperature(:sid); END;",
            [':sid' => [$setupId, PDO::PARAM_INT]]
        );

        return [
            'capacity_ok'  => (bool) $capacity,
            'water_type_ok'=> (bool) $waterOk,
            'temperature_ok'=> (bool) $tempOk,
            'all_valid'    => ($capacity && $waterOk && $tempOk),
        ];
    }

    public function getSetupPrice(int $setupId): float
    {
        $price = $this->callFunction(
            "BEGIN :result := get_setup_total_price(:sid); END;",
            [':sid' => [$setupId, PDO::PARAM_INT]]
        );
        return (float) $price;
    }

    public function saveSetup(int $setupId, int $customerId, ?string $shareCode, int $isPublic): int
    {
        return $this->callProcedureWithOutId(
            "BEGIN save_setup(:sid,:cid,:code,:pub,:saved); END;",
            [
                ':sid'  => [$setupId,    PDO::PARAM_INT],
                ':cid'  => [$customerId, PDO::PARAM_INT],
                ':code' => [$shareCode,  PDO::PARAM_STR],
                ':pub'  => [$isPublic,   PDO::PARAM_INT],
            ],
            ':saved'
        );
    }

    // ──────────────────────────────────────────────────────────────────────
    // ORDERS
    // ──────────────────────────────────────────────────────────────────────

    public function placeOrder(int $customerId, string $shippingAddr,
                               ?int $setupId = null, ?string $discountCode = null): int
    {
        return $this->callProcedureWithOutId(
            "BEGIN place_order(:cid,:sid,:code,:addr,:oid); END;",
            [
                ':cid'  => [$customerId,   PDO::PARAM_INT],
                ':sid'  => [$setupId,      PDO::PARAM_INT],
                ':code' => [$discountCode, PDO::PARAM_STR],
                ':addr' => [$shippingAddr, PDO::PARAM_STR],
            ],
            ':oid'
        );
    }

    public function cancelOrder(int $orderId, int $userId, ?string $reason = null): void
    {
        $stmt = $this->pdo->prepare("BEGIN cancel_order(:oid,:uid,:reason); END;");
        $stmt->bindValue(':oid',    $orderId, PDO::PARAM_INT);
        $stmt->bindValue(':uid',    $userId,  PDO::PARAM_INT);
        $stmt->bindValue(':reason', $reason,  PDO::PARAM_STR);
        $stmt->execute();
    }

    public function updateOrderStatus(int $orderId, string $newStatus, int $userId): void
    {
        $stmt = $this->pdo->prepare("BEGIN update_order_status(:oid,:status,:uid); END;");
        $stmt->bindValue(':oid',    $orderId,   PDO::PARAM_INT);
        $stmt->bindValue(':status', $newStatus, PDO::PARAM_STR);
        $stmt->bindValue(':uid',    $userId,    PDO::PARAM_INT);
        $stmt->execute();
    }

    // ──────────────────────────────────────────────────────────────────────
    // SUPPLIER POs
    // ──────────────────────────────────────────────────────────────────────

    public function createPO(int $supplierId, int $userId, ?string $expectedDate, ?string $notes): int
    {
        return $this->callProcedureWithOutId(
            "BEGIN create_supplier_po(:sid,:uid,TO_DATE(:edate,'YYYY-MM-DD'),:notes,:poid); END;",
            [
                ':sid'   => [$supplierId,   PDO::PARAM_INT],
                ':uid'   => [$userId,       PDO::PARAM_INT],
                ':edate' => [$expectedDate, PDO::PARAM_STR],
                ':notes' => [$notes,        PDO::PARAM_STR],
            ],
            ':poid'
        );
    }

    public function approvePO(int $poId, int $userId): void
    {
        $stmt = $this->pdo->prepare("BEGIN approve_supplier_po(:poid,:uid); END;");
        $stmt->bindValue(':poid', $poId,   PDO::PARAM_INT);
        $stmt->bindValue(':uid',  $userId, PDO::PARAM_INT);
        $stmt->execute();
    }

    public function receivePO(int $poId, int $userId): void
    {
        $stmt = $this->pdo->prepare("BEGIN receive_supplier_po(:poid,:uid); END;");
        $stmt->bindValue(':poid', $poId,   PDO::PARAM_INT);
        $stmt->bindValue(':uid',  $userId, PDO::PARAM_INT);
        $stmt->execute();
    }

    // ──────────────────────────────────────────────────────────────────────
    // INVENTORY
    // ──────────────────────────────────────────────────────────────────────

    public function adjustInventory(int $productId, int $delta, string $moveType,
                                    int $userId, ?string $notes = null): void
    {
        $stmt = $this->pdo->prepare(
            "BEGIN update_inventory(:pid,:delta,:type,NULL,'ADJUSTMENT',:uid,:notes); END;"
        );
        $stmt->bindValue(':pid',   $productId, PDO::PARAM_INT);
        $stmt->bindValue(':delta', $delta,     PDO::PARAM_INT);
        $stmt->bindValue(':type',  $moveType,  PDO::PARAM_STR);
        $stmt->bindValue(':uid',   $userId,    PDO::PARAM_INT);
        $stmt->bindValue(':notes', $notes,     PDO::PARAM_STR);
        $stmt->execute();
    }

    public function checkAvailability(int $productId, int $qty): bool
    {
        $result = $this->callFunction(
            "BEGIN :result := check_availability(:pid,:qty); END;",
            [
                ':pid' => [$productId, PDO::PARAM_INT],
                ':qty' => [$qty,       PDO::PARAM_INT],
            ]
        );
        return (bool) $result;
    }

    // ──────────────────────────────────────────────────────────────────────
    // RETURNS
    // ──────────────────────────────────────────────────────────────────────

    public function processReturn(int $returnId, int $userId, bool $approve): void
    {
        $stmt = $this->pdo->prepare("BEGIN process_return(:rid,:uid,:approve,NULL); END;");
        $stmt->bindValue(':rid',    $returnId,        PDO::PARAM_INT);
        $stmt->bindValue(':uid',    $userId,          PDO::PARAM_INT);
        $stmt->bindValue(':approve', $approve ? 1 : 0, PDO::PARAM_INT);
        $stmt->execute();
    }
}
