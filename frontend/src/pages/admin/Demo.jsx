/**
 * Oracle Database Showcase — Teacher-ready guided demo flow
 * Steps are sequential: each step must complete before the next can run.
 */
import { useEffect, useState } from 'react'
import {
  getCustomers, createSetup, addSetupItem, validateSetup,
  getSetupPrice, saveSetup, placeOrder, getInventory, getAlerts,
  getSuppliers, createPO, addPOItem, submitPO, approvePO, receivePO,
} from '../../api/client'
import OracleBadge from '../../components/OracleBadge'
import { PlayCircle, CheckCircle, Loader, ChevronDown, ChevronRight, Database, Lock, Truck, RotateCcw } from 'lucide-react'

/* ─── Section metadata ────────────────────────────────────────────── */
const SECTION_META = {
  aquarium: { label: 'Part 1 — Aquarium Builder', color: '#0071e3', bg: 'rgba(0,113,227,0.08)' },
  order:    { label: 'Part 2 — Order & Fulfillment', color: '#34c759', bg: 'rgba(52,199,89,0.08)' },
  restock:  { label: 'Part 3 — Supplier Restock', color: '#ff9500', bg: 'rgba(255,149,0,0.08)' },
}

/* ─── Step definitions ────────────────────────────────────────────── */
const STEPS = [
  {
    id: 'customer', section: 'aquarium', requires: [],
    label: 'Select Customer',
    description: 'Load active customers from the CUSTOMERS table. The selected customer flows through every subsequent step as the demo subject.',
    oracle: [{ type: 'TABLE', name: 'CUSTOMERS', detail: 'Direct scan filtered on IS_ACTIVE = 1' }],
    sql: `SELECT customer_id, first_name, last_name, email,
       order_count, lifetime_value
FROM   customers
WHERE  is_active = 1
ORDER  BY last_name`,
  },
  {
    id: 'setup', section: 'aquarium', requires: ['customer'],
    label: 'Create Aquarium Setup',
    description: 'CREATE_AQUARIUM_SETUP validates the tank selection, records water type and temperature parameters, and returns a new SETUP_ID used in all subsequent builder steps.',
    oracle: [
      { type: 'PROCEDURE', name: 'CREATE_AQUARIUM_SETUP', detail: 'Validates tank; inserts setup row; returns setup_id OUT' },
      { type: 'TABLE', name: 'AQUARIUM_SETUPS', detail: 'New row inserted by the procedure' },
    ],
    sql: `BEGIN
  create_aquarium_setup(
    p_customer_id => :cid,
    p_tank_id     => :tid,
    p_setup_name  => :name,
    p_water_type  => 'FRESHWATER',
    p_target_temp => 25,
    p_target_ph   => 7.0,
    p_setup_id    => :sid OUT
  );
END;`,
  },
  {
    id: 'items', section: 'aquarium', requires: ['setup'],
    label: 'Add Fish & Plants to Setup',
    description: 'ADD_ITEM_TO_SETUP inserts each product into the setup. Before inserting, it calls CHECK_COMPATIBILITY() internally — any HARD rule violation raises an application error.',
    oracle: [
      { type: 'PROCEDURE', name: 'ADD_ITEM_TO_SETUP', detail: 'Inserts item; raises ORA-20001 on hard conflict' },
      { type: 'FUNCTION',  name: 'CHECK_COMPATIBILITY', detail: 'Returns count of HARD violations in setup' },
      { type: 'TABLE',     name: 'COMPATIBILITY_RULES', detail: 'Species compatibility matrix' },
    ],
    sql: `BEGIN
  add_item_to_setup(
    p_setup_id   => :sid,
    p_product_id => :pid,
    p_item_type  => 'FISH',
    p_quantity   => 2,
    p_notes      => NULL
  );
END;
-- Called internally:
-- IF check_compatibility(:sid, :pid) > 0 THEN
--   RAISE_APPLICATION_ERROR(-20001, 'Compatibility conflict');
-- END IF;`,
  },
  {
    id: 'validate', section: 'aquarium', requires: ['items'],
    label: 'Validate: Capacity, Water Type & Temperature',
    description: 'Three Oracle functions validate the complete setup. VALIDATE_TANK_CAPACITY checks stocking density. VALIDATE_WATER_TYPE checks consistency. VALIDATE_TEMPERATURE checks range overlap.',
    oracle: [
      { type: 'FUNCTION', name: 'VALIDATE_TANK_CAPACITY', detail: 'Returns 1 if stocking density is safe' },
      { type: 'FUNCTION', name: 'VALIDATE_WATER_TYPE',    detail: 'Returns 1 if all items share water type' },
      { type: 'FUNCTION', name: 'VALIDATE_TEMPERATURE',   detail: 'Returns 1 if temperature ranges overlap' },
    ],
    sql: `SELECT
  validate_tank_capacity(:sid) AS capacity_ok,
  validate_water_type(:sid)    AS water_ok,
  validate_temperature(:sid)   AS temp_ok
FROM dual;`,
  },
  {
    id: 'save', section: 'aquarium', requires: ['validate'],
    label: 'Save Setup — SAVE_SETUP Procedure',
    description: 'SAVE_SETUP re-runs all three validations server-side, then commits the setup with SAVED status. GET_SETUP_TOTAL_PRICE returns the full cost including tank.',
    oracle: [
      { type: 'PROCEDURE', name: 'SAVE_SETUP', detail: 'Final validation + SAVED status commit' },
      { type: 'FUNCTION',  name: 'GET_SETUP_TOTAL_PRICE', detail: 'SUM of item prices + tank cost' },
    ],
    sql: `BEGIN
  save_setup(
    p_setup_id    => :sid,
    p_customer_id => :cid,
    p_share_code  => NULL,
    p_is_public   => 0,
    p_saved_id    => :saved_id OUT
  );
END;
-- Total: SELECT get_setup_total_price(:sid) FROM dual;`,
  },
  {
    id: 'order', section: 'order', requires: ['customer'],
    label: 'Place Order — PLACE_ORDER Procedure',
    description: 'PLACE_ORDER is one atomic call: validates stock via CHECK_AVAILABILITY(), calculates tax, inserts ORDERS + ORDER_ITEMS atomically, and returns the new order ID.',
    oracle: [
      { type: 'PROCEDURE', name: 'PLACE_ORDER', detail: 'Cart → confirmed order in a single atomic call' },
      { type: 'FUNCTION',  name: 'CHECK_AVAILABILITY', detail: 'Ensures qty_on_hand > qty_reserved per item' },
      { type: 'TABLE',     name: 'ORDERS + ORDER_ITEMS', detail: 'Both inserted atomically in one transaction' },
    ],
    sql: `BEGIN
  place_order(
    p_customer_id  => :cid,
    p_setup_id     => NULL,
    p_discount_code=> NULL,
    p_shipping_addr=> :addr,
    p_order_id     => :oid OUT
  );
END;
-- Per item: IF check_availability(pid, qty) = 0 THEN RAISE; END IF;`,
  },
  {
    id: 'inventory', section: 'order', requires: ['order'],
    label: 'Inventory Deduction — TRG_DEDUCT_STOCK',
    description: 'When PLACE_ORDER inserts into ORDER_ITEMS, TRG_DEDUCT_STOCK fires automatically — no application code needed. TRG_NO_NEGATIVE_STOCK prevents going below zero.',
    oracle: [
      { type: 'TRIGGER',   name: 'TRG_DEDUCT_STOCK',     detail: 'AFTER INSERT ON order_items — deducts qty_on_hand' },
      { type: 'TRIGGER',   name: 'TRG_NO_NEGATIVE_STOCK', detail: 'BEFORE UPDATE ON inventory — final guard' },
      { type: 'PROCEDURE', name: 'UPDATE_INVENTORY',      detail: 'Called by trigger; writes INVENTORY_MOVEMENTS row' },
    ],
    sql: `-- Fires automatically when PLACE_ORDER inserts order_items:
CREATE OR REPLACE TRIGGER trg_deduct_stock
AFTER INSERT ON order_items FOR EACH ROW
BEGIN
  update_inventory(
    :NEW.product_id, -:NEW.quantity,
    'SALE', :NEW.order_id, 'ORDER', 1, 'Order sale'
  );
END;`,
  },
  {
    id: 'audit', section: 'order', requires: ['inventory'],
    label: 'Audit Trail — TRG_AUDIT_LOG',
    description: 'TRG_AUDIT_LOG fires on every DML change across monitored tables, storing old/new values as JSON in AUDIT_LOG. VW_AUDIT_LOG_SUMMARY presents it human-readably.',
    oracle: [
      { type: 'TRIGGER', name: 'TRG_AUDIT_LOG',         detail: 'AFTER INSERT/UPDATE/DELETE on key tables' },
      { type: 'TABLE',   name: 'AUDIT_LOG',             detail: 'JSON old_values / new_values per change' },
      { type: 'VIEW',    name: 'VW_AUDIT_LOG_SUMMARY',  detail: 'Formats audit rows for the UI' },
    ],
    sql: `SELECT table_name, operation, record_id,
       old_values, new_values, changed_at
FROM   vw_audit_log_summary
ORDER  BY changed_at DESC
FETCH  FIRST 10 ROWS ONLY;`,
  },
  {
    id: 'reports', section: 'order', requires: ['audit'],
    label: 'Dashboard KPIs Updated — Oracle Views',
    description: 'All KPIs are Oracle views — they reflect the just-placed order instantly. No cache invalidation, no recalculation job, no stale data.',
    oracle: [
      { type: 'VIEW',     name: 'VW_DASHBOARD_KPIS', detail: 'Single-row KPI snapshot, always fresh' },
      { type: 'VIEW',     name: 'VW_MONTHLY_SALES',  detail: 'Revenue aggregated by month' },
      { type: 'FUNCTION', name: 'CALC_ORDER_PROFIT', detail: 'Revenue − COGS per order' },
    ],
    sql: `-- All live from views — no cache needed:
SELECT * FROM vw_dashboard_kpis;

SELECT sale_month, order_count, net_revenue
FROM   vw_monthly_sales ORDER BY sale_month DESC;`,
  },
  {
    id: 'restock_po', section: 'restock', requires: ['inventory'],
    label: 'Low Stock Alert → Create Supplier PO',
    description: 'TRG_LOW_STOCK_ALERT already fired when stock fell below reorder_level. Now CREATE_SUPPLIER_PO creates a new PO, then ADD_PO_ITEM adds the low-stock product.',
    oracle: [
      { type: 'TRIGGER',   name: 'TRG_LOW_STOCK_ALERT', detail: 'Already fired when qty_on_hand ≤ reorder_level' },
      { type: 'TABLE',     name: 'LOW_STOCK_ALERTS',    detail: 'One open alert per product (deduplicated)' },
      { type: 'PROCEDURE', name: 'CREATE_SUPPLIER_PO',  detail: 'Creates PO in DRAFT status' },
      { type: 'PROCEDURE', name: 'ADD_PO_ITEM',         detail: 'Adds a product line item to the PO' },
    ],
    sql: `-- Alert already in table from the trigger:
SELECT * FROM vw_low_stock WHERE product_id = :pid;

-- Create the restock PO:
BEGIN
  create_supplier_po(:sid,:uid,SYSDATE+14,:notes,:poid);
  add_po_item(:poid,:pid,20,:cost);
END;`,
  },
  {
    id: 'restock_submit', section: 'restock', requires: ['restock_po'],
    label: 'Submit PO — SUBMIT_SUPPLIER_PO',
    description: 'SUBMIT_SUPPLIER_PO transitions the PO from DRAFT to SUBMITTED, making it ready for manager approval.',
    oracle: [
      { type: 'PROCEDURE', name: 'SUBMIT_SUPPLIER_PO', detail: 'DRAFT → SUBMITTED status transition' },
      { type: 'TABLE',     name: 'SUPPLIER_PO',        detail: 'Status and lifecycle tracking' },
    ],
    sql: `BEGIN
  submit_supplier_po(p_po_id => :poid, p_user_id => :uid);
END;`,
  },
  {
    id: 'restock_approve', section: 'restock', requires: ['restock_submit'],
    label: 'Approve PO — APPROVE_SUPPLIER_PO',
    description: 'APPROVE_SUPPLIER_PO transitions the PO from SUBMITTED to APPROVED, authorising the purchase.',
    oracle: [
      { type: 'PROCEDURE', name: 'APPROVE_SUPPLIER_PO', detail: 'SUBMITTED → APPROVED status transition' },
    ],
    sql: `BEGIN
  approve_supplier_po(p_po_id => :poid, p_user_id => :uid);
END;`,
  },
  {
    id: 'restock_receive', section: 'restock', requires: ['restock_approve'],
    label: 'Receive Stock — RECEIVE_SUPPLIER_PO',
    description: 'RECEIVE_SUPPLIER_PO calls UPDATE_INVENTORY for each line item, adding quantity back to stock. The inventory movement and audit trail update automatically.',
    oracle: [
      { type: 'PROCEDURE', name: 'RECEIVE_SUPPLIER_PO', detail: 'APPROVED → RECEIVED; calls UPDATE_INVENTORY per item' },
      { type: 'PROCEDURE', name: 'UPDATE_INVENTORY',    detail: 'Adds received qty; writes PURCHASE movement' },
      { type: 'VIEW',      name: 'VW_STOCK_MOVEMENT_LOG', detail: 'Shows new PURCHASE movement row' },
    ],
    sql: `BEGIN
  receive_supplier_po(p_po_id => :poid, p_user_id => :uid);
END;
-- Internally per item:
-- update_inventory(:pid,:qty,'PURCHASE',:poid,'PO',:uid,'PO received');`,
  },
]

/* ─── Component ───────────────────────────────────────────────────── */
export default function Demo() {
  const [customers,      setCustomers]      = useState([])
  const [selectedCust,   setSelectedCust]   = useState(null)
  const [tanks,          setTanks]          = useState([])
  const [stepResults,    setStepResults]    = useState({})
  const [expandSQL,      setExpandSQL]      = useState({})
  const [setupId,        setSetupId]        = useState(null)
  const [orderId,        setOrderId]        = useState(null)
  const [poId,           setPoId]           = useState(null)
  const [orderedProduct, setOrderedProduct] = useState(null) // { id, name, beforeQty }

  useEffect(() => {
    getCustomers({}).then(r => {
      setCustomers(r.data)
      if (r.data.length) setSelectedCust(r.data[0])
    }).catch(() => {})
    import('../../api/client').then(({ getProductType }) =>
      getProductType('TANK').then(r => setTanks(r.data)).catch(() => {})
    )
  }, [])

  const setResult = (id, patch) =>
    setStepResults(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }))
  const markRunning = id => setResult(id, { running: true, done: false, error: null, data: null })
  const markDone    = (id, data) => setResult(id, { running: false, done: true, data })
  const markFail    = (id, err)  => setResult(id, { running: false, done: false, error: String(err) })

  const isLocked = stepId => {
    const step = STEPS.find(s => s.id === stepId)
    return step ? step.requires.some(req => !stepResults[req]?.done) : false
  }

  const runStep = async stepId => {
    if (isLocked(stepId)) return
    markRunning(stepId)
    try {
      switch (stepId) {

        case 'customer': {
          const r = await getCustomers({})
          if (!selectedCust && r.data.length) setSelectedCust(r.data[0])
          markDone(stepId, { count: r.data.length, sample: r.data.slice(0, 5) })
          break
        }

        case 'setup': {
          const tank = tanks[0]
          if (!tank) { markFail(stepId, 'No tanks found in catalog'); break }
          const r = await createSetup({
            customer_id: selectedCust.CUSTOMER_ID,
            tank_id: Number(tank.TANK_ID ?? tank.PRODUCT_ID),
            setup_name: `Demo Setup — ${new Date().toLocaleTimeString()}`,
            water_type: 'FRESHWATER', target_temp_c: 25, target_ph: 7.0,
          })
          setSetupId(r.data.setup_id)
          markDone(stepId, { setup_id: r.data.setup_id, tank: tank.PRODUCT_NAME })
          break
        }

        case 'items': {
          const { getProductType } = await import('../../api/client')
          const fishR = await getProductType('FISH')
          const fish = fishR.data.filter(f => Number(f.QTY_ON_HAND ?? 0) > 0).slice(0, 2)
          const added = []
          for (const f of fish) {
            try {
              await addSetupItem(setupId, { product_id: f.PRODUCT_ID, item_type: 'FISH', quantity: 2 })
              added.push(f.PRODUCT_NAME)
            } catch {}
          }
          markDone(stepId, { added })
          break
        }

        case 'validate': {
          const r     = await validateSetup(setupId)
          const price = await getSetupPrice(setupId)
          markDone(stepId, { ...r.data, total_price: price.data.total_price })
          break
        }

        case 'save': {
          const priceR = await getSetupPrice(setupId)
          const saveR  = await saveSetup(setupId, { customer_id: selectedCust.CUSTOMER_ID, is_public: 0 })
          markDone(stepId, { saved_id: saveR.data.saved_id, total_price: priceR.data.total_price })
          break
        }

        case 'order': {
          const { getProductType, addToCart, clearCart } = await import('../../api/client')
          const fishR = await getProductType('FISH')
          const fish = fishR.data.find(f => Number(f.QTY_ON_HAND ?? 0) > 0)
          if (!fish) { markFail(stepId, 'No fish in stock to order'); break }
          const beforeQty = Number(fish.QTY_ON_HAND)
          setOrderedProduct({ id: fish.PRODUCT_ID, name: fish.PRODUCT_NAME, beforeQty })
          await clearCart(selectedCust.CUSTOMER_ID)
          await addToCart(selectedCust.CUSTOMER_ID, { product_id: fish.PRODUCT_ID, quantity: 1 })
          const r = await placeOrder({
            customer_id: selectedCust.CUSTOMER_ID,
            shipping_addr: '123 Demo Street, Oracle City',
          })
          setOrderId(r.data.order_id)
          markDone(stepId, { order_id: r.data.order_id, product: fish.PRODUCT_NAME, before_qty: beforeQty })
          break
        }

        case 'inventory': {
          const [invR, alertsR] = await Promise.all([getInventory(), getAlerts()])
          const currentProd = invR.data.find(r => r.PRODUCT_ID === orderedProduct?.id)
          markDone(stepId, {
            product:     orderedProduct?.name,
            before_qty:  orderedProduct?.beforeQty,
            after_qty:   currentProd ? Number(currentProd.QTY_ON_HAND) : '?',
            alert_count: alertsR.data.length,
            snapshot: invR.data.slice(0, 4).map(r => ({ name: r.PRODUCT_NAME, qty: r.QTY_ON_HAND })),
          })
          break
        }

        case 'audit': {
          const { getAuditLog } = await import('../../api/client')
          const r = await getAuditLog({ limit: 8 })
          markDone(stepId, { logs: r.data })
          break
        }

        case 'reports': {
          const { getDashboard, getMonthlySales } = await import('../../api/client')
          const [dash, sales] = await Promise.all([getDashboard(), getMonthlySales({})])
          const kpi = dash.data?.[0] ?? {}
          markDone(stepId, {
            revenue:   kpi.REVENUE_THIS_MONTH,
            orders:    kpi.ORDERS_THIS_MONTH,
            customers: kpi.TOTAL_CUSTOMERS,
            months:    sales.data.length,
          })
          break
        }

        case 'restock_po': {
          const alertsR     = await getAlerts()
          const alert       = alertsR.data[0]
          if (!alert) { markFail(stepId, 'No low-stock alerts. Run the Order step and Inventory step first, or trigger more sales.'); break }
          const suppliersR  = await getSuppliers()
          const supplier    = suppliersR.data[0]
          if (!supplier) { markFail(stepId, 'No active suppliers found'); break }
          const expected    = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)
          const poR         = await createPO({ supplier_id: supplier.SUPPLIER_ID, expected_date: expected, notes: 'Demo restock PO', created_by: 1 })
          const newPoId     = poR.data.po_id
          setPoId(newPoId)
          const { getProduct } = await import('../../api/client')
          const prodR       = await getProduct(alert.PRODUCT_ID)
          const cost        = Math.max(1, Number(prodR.data.UNIT_PRICE ?? 10) * 0.5)
          await addPOItem(newPoId, { product_id: alert.PRODUCT_ID, quantity: 20, unit_cost: cost })
          markDone(stepId, { po_id: newPoId, supplier: supplier.SUPPLIER_NAME, product: alert.PRODUCT_NAME, qty: 20, cost })
          break
        }

        case 'restock_submit': {
          await submitPO(poId, { user_id: 1 })
          markDone(stepId, { po_id: poId })
          break
        }

        case 'restock_approve': {
          await approvePO(poId, { user_id: 1 })
          markDone(stepId, { po_id: poId })
          break
        }

        case 'restock_receive': {
          await receivePO(poId, { user_id: 1 })
          const { getStockMovements } = await import('../../api/client')
          const movR = await getStockMovements({ limit: 5 })
          markDone(stepId, {
            po_id: poId,
            movements: movR.data.slice(0, 3).map(m => ({ product: m.PRODUCT_NAME, type: m.MOVEMENT_TYPE, qty: m.QUANTITY_CHANGE })),
          })
          break
        }

        default: markDone(stepId, {})
      }
    } catch (e) {
      markFail(stepId, e.response?.data?.error ?? e.message)
    }
  }

  const runAll = async () => {
    for (const step of STEPS) {
      if (!stepResults[step.id]?.done) {
        await runStep(step.id)
        await new Promise(r => setTimeout(r, 500))
      }
    }
  }

  const reset = () => {
    setStepResults({})
    setSetupId(null); setOrderId(null); setPoId(null); setOrderedProduct(null)
    if (customers.length) setSelectedCust(customers[0])
  }

  // Group steps into sections
  const sections = STEPS.reduce((acc, step) => {
    const last = acc[acc.length - 1]
    if (last?.section === step.section) { last.steps.push(step) }
    else { acc.push({ section: step.section, steps: [step] }) }
    return acc
  }, [])

  const doneCount = STEPS.filter(s => stepResults[s.id]?.done).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 920 }}>

      {/* ── Header ──────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #0a1628 0%, #0d2b52 100%)',
        borderRadius: 20, padding: '28px 32px', color: 'white',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, marginBottom: 20 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <Database size={20} color="#0071e3" />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#0071e3', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Oracle Database Showcase
              </span>
            </div>
            <h1 style={{ margin: '0 0 10px', fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em' }}>
              Guided Demo Flow
            </h1>
            <p style={{ margin: 0, fontSize: 14, color: 'rgba(255,255,255,0.6)', maxWidth: 520, lineHeight: 1.6 }}>
              Walk through a real end-to-end transaction — aquarium building, order placement,
              and supplier restock — watching which Oracle{' '}
              <strong style={{ color: 'white' }}>procedures</strong>,{' '}
              <strong style={{ color: 'white' }}>functions</strong>,{' '}
              <strong style={{ color: 'white' }}>triggers</strong>, and{' '}
              <strong style={{ color: 'white' }}>views</strong> fire at each step.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexDirection: 'column', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={reset} style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px',
                borderRadius: 10, border: '1px solid rgba(255,255,255,0.2)',
                background: 'transparent', color: 'rgba(255,255,255,0.7)',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}>
                <RotateCcw size={14} /> Reset
              </button>
              <button onClick={runAll} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px',
                borderRadius: 10, border: 'none', background: '#0071e3',
                color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              }}>
                <PlayCircle size={16} /> Run All Steps
              </button>
            </div>
            {/* Progress bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <div style={{ width: 140, height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.15)', overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 4, background: '#34c759', width: `${(doneCount / STEPS.length) * 100}%`, transition: 'width 0.4s' }} />
              </div>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{doneCount}/{STEPS.length} steps done</span>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {[
            ['PROCEDURE', 'Stored procedure — business logic + transactions'],
            ['FUNCTION',  'Returns a scalar value; used in SQL'],
            ['TRIGGER',   'Fires automatically on DML events'],
            ['VIEW',      'Named query — always fresh, no cache'],
          ].map(([type, desc]) => (
            <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <OracleBadge type={type} name={type} inline />
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Customer picker ──────────────────────────────────────── */}
      {customers.length > 0 && (
        <div className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Database size={14} color="#8e8e93" />
          <span style={{ fontSize: 13, color: '#6e6e73', flexShrink: 0 }}>Demo customer:</span>
          <select className="input" style={{ width: 280 }}
            value={selectedCust?.CUSTOMER_ID ?? ''}
            onChange={e => setSelectedCust(customers.find(c => c.CUSTOMER_ID === Number(e.target.value)))}>
            {customers.map(c => (
              <option key={c.CUSTOMER_ID} value={c.CUSTOMER_ID}>
                {c.FIRST_NAME} {c.LAST_NAME} — {c.EMAIL}
              </option>
            ))}
          </select>
          <div style={{ display: 'flex', gap: 8, marginLeft: 'auto', flexWrap: 'wrap' }}>
            {setupId && <Pill label="Setup" value={`#${setupId}`} color="#0071e3" />}
            {orderId && <Pill label="Order" value={`#${orderId}`} color="#34c759" />}
            {poId    && <Pill label="PO"    value={`#${poId}`}    color="#ff9500" />}
          </div>
        </div>
      )}

      {/* ── Step sections ────────────────────────────────────────── */}
      {sections.map(({ section, steps: sSteps }) => {
        const meta = SECTION_META[section]
        return (
          <div key={section}>
            {/* Section header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, paddingBottom: 10, borderBottom: `2px solid ${meta.color}22` }}>
              {section === 'restock' ? <Truck size={16} color={meta.color} /> : <Database size={16} color={meta.color} />}
              <span style={{ fontSize: 13, fontWeight: 700, color: meta.color }}>{meta.label}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {sSteps.map(step => {
                const globalIdx = STEPS.indexOf(step)
                const res     = stepResults[step.id] ?? {}
                const locked  = isLocked(step.id)
                const sqlOpen = expandSQL[step.id]

                return (
                  <div key={step.id} className="card" style={{ padding: 0, overflow: 'hidden', opacity: locked ? 0.5 : 1, transition: 'opacity 0.25s' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '18px 20px' }}>

                      {/* Step bubble */}
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%', flexShrink: 0, marginTop: 2,
                        background: res.done ? '#e8f8ee' : res.error ? '#fff2f2' : locked ? '#f5f5f7' : meta.bg,
                        border: `2px solid ${res.done ? '#34c759' : res.error ? '#ff3b30' : locked ? '#e5e5ea' : meta.color + '55'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {res.running
                          ? <Loader size={14} color={meta.color} style={{ animation: 'spin 1s linear infinite' }} />
                          : res.done
                          ? <CheckCircle size={14} color="#34c759" />
                          : locked
                          ? <Lock size={12} color="#aeaeb2" />
                          : <span style={{ fontSize: 12, fontWeight: 800, color: meta.color }}>{globalIdx + 1}</span>
                        }
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        {/* Title row */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: locked ? '#8e8e93' : '#1d1d1f' }}>
                            {step.label}
                          </span>
                          {res.error && <Tag text="Error" color="#ff3b30" bg="#fff2f2" />}
                          {locked && !res.done && <Tag text="Complete previous step first" color="#aeaeb2" bg="#f5f5f7" />}
                        </div>

                        <p style={{ margin: '0 0 10px', fontSize: 13, color: '#6e6e73', lineHeight: 1.5 }}>
                          {step.description}
                        </p>

                        {/* Oracle badges */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                          {step.oracle.map((o, i) => (
                            <OracleBadge key={i} type={o.type} name={o.name} detail={o.detail} />
                          ))}
                        </div>

                        {/* Result */}
                        {res.done && res.data && <StepResult stepId={step.id} data={res.data} color={meta.color} />}
                        {res.error && (
                          <div style={{ fontSize: 12, color: '#ff3b30', background: '#fff2f2', borderRadius: 8, padding: '8px 12px', marginTop: 6 }}>
                            {res.error}
                          </div>
                        )}

                        {/* SQL toggle */}
                        <button
                          onClick={() => setExpandSQL(p => ({ ...p, [step.id]: !p[step.id] }))}
                          style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: '#8e8e93', padding: '4px 0', marginTop: 6 }}>
                          {sqlOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                          {sqlOpen ? 'Hide SQL / PL·SQL' : 'Show SQL / PL·SQL'}
                        </button>
                        {sqlOpen && (
                          <pre style={{ margin: '8px 0 0', background: '#1d1d1f', color: '#e0e0e0', borderRadius: 10, padding: '14px 16px', fontSize: 11, lineHeight: 1.7, overflow: 'auto', fontFamily: '"SF Mono", monospace' }}>
                            {step.sql}
                          </pre>
                        )}
                      </div>

                      {/* Run button */}
                      <button
                        onClick={() => runStep(step.id)}
                        disabled={locked || res.running}
                        style={{
                          flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6,
                          padding: '8px 14px', borderRadius: 9999, border: 'none',
                          background: res.done ? '#e8f8ee' : locked ? '#f5f5f7' : meta.color,
                          color: res.done ? '#34c759' : locked ? '#aeaeb2' : 'white',
                          fontSize: 12, fontWeight: 600,
                          cursor: locked || res.running ? 'not-allowed' : 'pointer',
                          opacity: res.running ? 0.7 : 1, transition: 'all 0.2s',
                        }}>
                        {res.running
                          ? <><Loader size={12} style={{ animation: 'spin 1s linear infinite' }} /> Running…</>
                          : res.done
                          ? <><CheckCircle size={12} /> Done</>
                          : locked
                          ? <><Lock size={12} /> Locked</>
                          : <><PlayCircle size={12} /> Run</>
                        }
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* ── Oracle objects summary ───────────────────────────────── */}
      <div className="card" style={{ background: '#f5f5f7', padding: '20px 24px' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#1d1d1f', marginBottom: 14 }}>
          Oracle Objects Used in This Demo
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {[
            { type: 'PROCEDURE', items: ['PLACE_ORDER', 'CANCEL_ORDER', 'UPDATE_INVENTORY', 'CREATE_AQUARIUM_SETUP', 'ADD_ITEM_TO_SETUP', 'SAVE_SETUP', 'CREATE_SUPPLIER_PO', 'ADD_PO_ITEM', 'SUBMIT_SUPPLIER_PO', 'APPROVE_SUPPLIER_PO', 'RECEIVE_SUPPLIER_PO'] },
            { type: 'FUNCTION',  items: ['GET_SETUP_TOTAL_PRICE', 'CHECK_COMPATIBILITY', 'VALIDATE_TANK_CAPACITY', 'VALIDATE_WATER_TYPE', 'VALIDATE_TEMPERATURE', 'CHECK_AVAILABILITY', 'CALC_ORDER_PROFIT', 'GET_PRODUCT_STOCK'] },
            { type: 'TRIGGER',   items: ['TRG_DEDUCT_STOCK', 'TRG_NO_NEGATIVE_STOCK', 'TRG_LOW_STOCK_ALERT', 'TRG_AUDIT_LOG'] },
            { type: 'VIEW',      items: ['VW_DASHBOARD_KPIS', 'VW_MONTHLY_SALES', 'VW_BEST_SELLING_FISH', 'VW_FAST_MOVERS', 'VW_LOW_STOCK', 'VW_AUDIT_LOG_SUMMARY'] },
            { type: 'VIEW',      items: ['VW_STOCK_MOVEMENT_LOG', 'VW_INVENTORY_SUMMARY', 'VW_CUSTOMER_PURCHASE_HISTORY', 'VW_SUPPLIER_INVENTORY', 'VW_ORDER_DETAILS'] },
            { type: 'TABLE',     items: ['ORDERS', 'ORDER_ITEMS', 'INVENTORY', 'INVENTORY_MOVEMENTS', 'AUDIT_LOG', 'LOW_STOCK_ALERTS', 'AQUARIUM_SETUPS', 'COMPATIBILITY_RULES'] },
          ].map((group, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <OracleBadge type={group.type} name={`${group.items.length} ${group.type}${group.items.length !== 1 ? 'S' : ''}`} />
              {group.items.map(name => (
                <div key={name} style={{ fontSize: 11, fontFamily: 'monospace', color: '#3a3a3c', paddingLeft: 8 }}>{name}</div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

/* ─── Small UI helpers ────────────────────────────────────────────── */
function Pill({ label, value, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: color + '14', border: `1px solid ${color}33`, borderRadius: 8, padding: '3px 10px' }}>
      <span style={{ fontSize: 10, color: color + 'aa', fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 12, fontFamily: 'monospace', color, fontWeight: 700 }}>{value}</span>
    </div>
  )
}

function Tag({ text, color, bg }) {
  return (
    <span style={{ fontSize: 11, color, background: bg, borderRadius: 6, padding: '2px 8px', flexShrink: 0 }}>
      {text}
    </span>
  )
}

/* ─── Step result renderer ────────────────────────────────────────── */
function StepResult({ stepId, data, color }) {
  const Row = ({ label, value }) => (
    <div style={{ display: 'flex', gap: 8, fontSize: 12 }}>
      <span style={{ color: '#8e8e93', minWidth: 110, flexShrink: 0 }}>{label}</span>
      <strong style={{ color: '#1d1d1f', fontFamily: 'monospace' }}>{value}</strong>
    </div>
  )

  const renderers = {
    customer: d => (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <Row label="Total customers" value={d.count} />
        {d.sample?.map(c => (
          <div key={c.CUSTOMER_ID} style={{ fontSize: 11, color: '#3a3a3c', paddingLeft: 8 }}>
            {c.FIRST_NAME} {c.LAST_NAME} · {c.EMAIL}
          </div>
        ))}
      </div>
    ),
    setup: d => (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <Row label="Setup ID" value={d.setup_id} />
        <Row label="Tank"     value={d.tank} />
      </div>
    ),
    items: d => (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <Row label="Items added" value={d.added?.length ?? 0} />
        {d.added?.map(n => <div key={n} style={{ fontSize: 11, color: '#3a3a3c', paddingLeft: 8 }}>{n}</div>)}
      </div>
    ),
    validate: d => (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', gap: 20 }}>
          {[['Capacity', d.capacity_ok], ['Water Type', d.water_ok], ['Temperature', d.temp_ok]].map(([l, v]) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 14, height: 14, borderRadius: '50%', background: v ? '#34c759' : '#ff3b30' }} />
              <span style={{ fontSize: 12, color: '#3a3a3c' }}>{l}: {v ? 'OK' : 'Fail'}</span>
            </div>
          ))}
        </div>
        {d.total_price != null && <Row label="Estimated cost" value={`$${Number(d.total_price).toFixed(2)}`} />}
      </div>
    ),
    save: d => (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <Row label="Saved ID"    value={d.saved_id} />
        <Row label="Total price" value={`$${Number(d.total_price ?? 0).toFixed(2)}`} />
      </div>
    ),
    order: d => (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <Row label="Order ID"    value={d.order_id} />
        <Row label="Product"     value={d.product} />
        <Row label="Stock before" value={d.before_qty} />
        <div style={{ fontSize: 11, color: '#6e6e73', paddingLeft: 0, marginTop: 2 }}>
          TRG_DEDUCT_STOCK will fire after this — see next step for the deduction.
        </div>
      </div>
    ),
    inventory: d => (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {d.product && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff2f2', borderRadius: 8, padding: '10px 14px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: '#6e6e73', minWidth: 140 }}>{d.product}</span>
            <span style={{ fontSize: 16, fontWeight: 800, fontFamily: 'monospace', color: '#1d1d1f' }}>{d.before_qty}</span>
            <span style={{ fontSize: 16, color: '#aeaeb2', fontWeight: 300 }}>→</span>
            <span style={{ fontSize: 16, fontWeight: 800, fontFamily: 'monospace', color: '#ff3b30' }}>{d.after_qty}</span>
            <span style={{ fontSize: 11, color: '#ff3b30', background: '#ffe6e6', borderRadius: 6, padding: '3px 8px', fontWeight: 600 }}>
              −1 by TRG_DEDUCT_STOCK
            </span>
          </div>
        )}
        <Row label="Open alerts" value={d.alert_count} />
      </div>
    ),
    audit: d => (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {d.logs?.map((l, i) => (
          <div key={i} style={{ fontSize: 11, color: '#3a3a3c', fontFamily: 'monospace' }}>
            <span style={{ color: '#aeaeb2' }}>[{l.ACTION}]</span>{' '}
            <span style={{ color: '#0071e3' }}>{l.TABLE_NAME}</span>{' '}
            #{l.RECORD_ID}
          </div>
        ))}
      </div>
    ),
    reports: d => (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
        <Row label="Revenue MTD"   value={`$${Number(d.revenue ?? 0).toFixed(2)}`} />
        <Row label="Orders MTD"    value={d.orders} />
        <Row label="Customers"     value={d.customers} />
        <Row label="Months of data" value={d.months} />
      </div>
    ),
    restock_po: d => (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <Row label="PO ID"     value={d.po_id} />
        <Row label="Supplier"  value={d.supplier} />
        <Row label="Product"   value={d.product} />
        <Row label="Qty to order" value={d.qty} />
        <Row label="Unit cost" value={`$${Number(d.cost).toFixed(2)}`} />
      </div>
    ),
    restock_submit:  d => <div style={{ fontSize: 12, color: '#6e6e73' }}>PO #{d.po_id} — Status → <strong>SUBMITTED</strong></div>,
    restock_approve: d => <div style={{ fontSize: 12, color: '#6e6e73' }}>PO #{d.po_id} — Status → <strong>APPROVED</strong></div>,
    restock_receive: d => (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ fontSize: 12, color: '#34c759', fontWeight: 600 }}>PO #{d.po_id} — RECEIVED — stock replenished</div>
        {d.movements?.map((m, i) => (
          <div key={i} style={{ fontSize: 11, fontFamily: 'monospace', color: '#3a3a3c', paddingLeft: 8 }}>
            [{m.type}] {m.product}: {m.qty > 0 ? '+' : ''}{m.qty}
          </div>
        ))}
      </div>
    ),
  }

  const renderer = renderers[stepId]
  if (!renderer) return null

  return (
    <div style={{ background: '#f5f5f7', borderRadius: 10, padding: '10px 14px', marginTop: 10, border: `1px solid ${color}22` }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#aeaeb2', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
        Live Result from Oracle
      </div>
      {renderer(data)}
    </div>
  )
}
