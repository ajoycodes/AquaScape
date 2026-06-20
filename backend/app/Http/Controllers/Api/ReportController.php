<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\OracleService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * ReportController
 * All reports read directly from Oracle views — no business logic here.
 * The views contain the SQL complexity; this controller just proxies JSON.
 */
class ReportController extends Controller
{
    public function __construct(private OracleService $oracle) {}

    /** GET /api/v1/reports/dashboard */
    public function dashboard(): JsonResponse
    {
        $kpis = $this->oracle->query("SELECT * FROM vw_dashboard_kpis");
        return response()->json($kpis[0] ?? []);
    }

    /** GET /api/v1/reports/monthly-sales */
    public function monthlySales(Request $request): JsonResponse
    {
        $limit = $request->query('months', 12);
        $rows  = $this->oracle->query(
            "SELECT * FROM vw_monthly_sales WHERE ROWNUM <= :lim",
            [':lim' => $limit]
        );
        return response()->json($rows);
    }

    /** GET /api/v1/reports/best-sellers */
    public function bestSellers(Request $request): JsonResponse
    {
        $limit = $request->query('limit', 10);
        $rows  = $this->oracle->query(
            "SELECT * FROM vw_best_selling_fish WHERE ROWNUM <= :lim",
            [':lim' => $limit]
        );
        return response()->json($rows);
    }

    /** GET /api/v1/reports/low-stock */
    public function lowStock(): JsonResponse
    {
        return response()->json($this->oracle->query("SELECT * FROM vw_low_stock"));
    }

    /** GET /api/v1/reports/profit */
    public function profitAnalysis(Request $request): JsonResponse
    {
        $limit = $request->query('limit', 50);
        $rows  = $this->oracle->query(
            "SELECT * FROM vw_profit_analysis WHERE ROWNUM <= :lim",
            [':lim' => $limit]
        );
        return response()->json($rows);
    }

    /** GET /api/v1/reports/popular-setups */
    public function popularSetups(): JsonResponse
    {
        return response()->json($this->oracle->query("SELECT * FROM vw_popular_setups"));
    }

    /** GET /api/v1/reports/fast-movers */
    public function fastMovers(): JsonResponse
    {
        return response()->json($this->oracle->query("SELECT * FROM vw_fast_movers"));
    }

    /** GET /api/v1/reports/compatibility */
    public function compatibilityReport(): JsonResponse
    {
        return response()->json(
            $this->oracle->query("SELECT * FROM vw_compatibility_failure_report")
        );
    }

    /** GET /api/v1/reports/supplier-inv */
    public function supplierInventory(): JsonResponse
    {
        return response()->json($this->oracle->query("SELECT * FROM vw_supplier_inventory"));
    }

    /** GET /api/v1/reports/customer-history */
    public function customerHistory(Request $request): JsonResponse
    {
        $limit = $request->query('limit', 50);
        $rows  = $this->oracle->query(
            "SELECT * FROM vw_customer_purchase_history WHERE ROWNUM <= :lim",
            [':lim' => $limit]
        );
        return response()->json($rows);
    }

    /** GET /api/v1/reports/product-ratings */
    public function productRatings(): JsonResponse
    {
        return response()->json(
            $this->oracle->query("SELECT * FROM vw_product_rating_analysis")
        );
    }

    /** GET /api/v1/reports/audit-log */
    public function auditLog(Request $request): JsonResponse
    {
        $table  = $request->query('table');
        $limit  = $request->query('limit', 100);
        $sql    = "SELECT * FROM vw_audit_log_summary";
        $bindings = [];

        if ($table) {
            $sql .= " WHERE table_name = :tbl";
            $bindings[':tbl'] = strtoupper($table);
        }

        $sql .= " AND ROWNUM <= :lim";
        $bindings[':lim'] = $limit;

        return response()->json($this->oracle->query($sql, $bindings));
    }

    /** GET /api/v1/reports/stock-movements */
    public function stockMovements(Request $request): JsonResponse
    {
        $productId = $request->query('product_id');
        $limit     = $request->query('limit', 100);
        $sql       = "SELECT * FROM vw_stock_movement_log";
        $bindings  = [];

        if ($productId) {
            $sql .= " WHERE product_id = :pid";   // note: vw_ joins product name
            $bindings[':pid'] = $productId;
        }
        $sql .= " AND ROWNUM <= :lim";
        $bindings[':lim'] = $limit;

        return response()->json($this->oracle->query($sql, $bindings));
    }
}
