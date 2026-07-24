#!/usr/bin/env python3
"""Generates a classic Chen-notation ER diagram (entity=box, attribute=ellipse,
relationship=diamond) for the AquaScape schema, rendered via Graphviz dot."""

ENTITY_FILL = "#CDEACD"      # green
ATTR_FILL   = "#F6CFCB"      # pink/salmon
REL_FILL    = "#D6E6F7"      # light blue
EDGE_COLOR  = "#5B5F66"

# entity_name -> [(attr_label, is_pk), ...]
ENTITIES = {
    "Roles":        [("id", 1), ("name", 0)],
    "Users":        [("id", 1), ("username", 0), ("email", 0)],
    "Customers":    [("id", 1), ("first_name", 0), ("last_name", 0), ("email", 0), ("phone", 0)],
    "Suppliers":    [("id", 1), ("name", 0), ("contact_name", 0), ("email", 0)],
    "Categories":   [("id", 1), ("name", 0)],
    "Products":     [("id", 1), ("name", 0), ("type", 0), ("unit_price", 0)],
    "Inventory":    [("id", 1), ("qty_on_hand", 0), ("reorder_level", 0)],
    "Tanks":        [("id", 1), ("volume_liters", 0), ("material", 0)],
    "Fish":         [("id", 1), ("species", 0), ("water_type", 0), ("temp_range", 0)],
    "Plants":       [("id", 1), ("species", 0), ("water_type", 0), ("light_need", 0)],
    "Equipment":    [("id", 1), ("equip_type", 0), ("power_watts", 0)],
    "Decorations":  [("id", 1), ("deco_type", 0), ("safe_water", 0)],

    "AquariumSetups": [("id", 1), ("name", 0), ("water_type", 0), ("status", 0)],
    "SetupItems":     [("id", 1), ("item_type", 0), ("quantity", 0)],
    "CompatRules":    [("id", 1), ("rule_type", 0), ("severity", 0)],
    "SavedSetups":    [("id", 1), ("share_code", 0), ("is_public", 0)],
    "Wishlist":       [("id", 1)],
    "Cart":           [("id", 1)],
    "CartItems":      [("id", 1), ("quantity", 0)],

    "Discounts":      [("id", 1), ("code", 0), ("type", 0), ("value", 0)],
    "Orders":         [("id", 1), ("status", 0), ("total_amount", 0)],
    "OrderItems":     [("id", 1), ("quantity", 0), ("unit_price", 0), ("line_total", 0)],
    "OrderDiscounts": [("applied_amount", 0)],
    "Payments":       [("id", 1), ("amount", 0), ("method", 0), ("status", 0)],
    "Returns":        [("id", 1), ("status", 0), ("refund_amount", 0)],
    "ReturnItems":    [("id", 1), ("quantity", 0), ("condition", 0)],

    "SupplierPO":       [("id", 1), ("status", 0), ("total_amount", 0)],
    "SupplierPOItems":  [("id", 1), ("qty_ordered", 0), ("unit_cost", 0)],
    "StockBatches":     [("id", 1), ("quantity", 0), ("expiry_date", 0)],
    "LowStockAlerts":   [("id", 1), ("qty_at_alert", 0), ("is_resolved", 0)],
    "InvMovements":     [("id", 1), ("move_type", 0), ("qty_delta", 0)],
    "AuditLog":         [("id", 1), ("table_name", 0), ("operation", 0)],
}

DOMAIN_OF = {}
for e in ["Roles","Users","Customers","Suppliers","Categories","Products","Inventory",
          "Tanks","Fish","Plants","Equipment","Decorations"]:
    DOMAIN_OF[e] = "core"
for e in ["AquariumSetups","SetupItems","CompatRules","SavedSetups","Wishlist","Cart","CartItems"]:
    DOMAIN_OF[e] = "builder"
for e in ["Discounts","Orders","OrderItems","OrderDiscounts","Payments","Returns","ReturnItems"]:
    DOMAIN_OF[e] = "orders"
for e in ["SupplierPO","SupplierPOItems","StockBatches","LowStockAlerts","InvMovements","AuditLog"]:
    DOMAIN_OF[e] = "supplier"

# relationship_name -> [(entity, cardinality_label), (entity, cardinality_label)]
RELATIONSHIPS = [
    ("Has",          [("Roles", "1"), ("Users", "n")]),
    ("ParentOf",     [("Categories", "1"), ("Categories", "n")]),
    ("Categorizes",  [("Categories", "1"), ("Products", "n")]),
    ("Tracks",       [("Products", "1"), ("Inventory", "1")]),

    ("IsA1", [("Products", ""), ("Tanks", "")]),
    ("IsA2", [("Products", ""), ("Fish", "")]),
    ("IsA3", [("Products", ""), ("Plants", "")]),
    ("IsA4", [("Products", ""), ("Equipment", "")]),
    ("IsA5", [("Products", ""), ("Decorations", "")]),

    ("Creates",      [("Customers", "1"), ("AquariumSetups", "n")]),
    ("UsedIn",       [("Tanks", "1"), ("AquariumSetups", "n")]),
    ("Contains1",    [("AquariumSetups", "1"), ("SetupItems", "n")]),
    ("IncludedAs",   [("Products", "1"), ("SetupItems", "n")]),
    ("RuleA",        [("Products", "1"), ("CompatRules", "n")]),
    ("RuleB",        [("Products", "1"), ("CompatRules", "n")]),
    ("Defines",      [("Users", "1"), ("CompatRules", "n")]),
    ("SavedAs",      [("AquariumSetups", "1"), ("SavedSetups", "1")]),
    ("Owns1",        [("Customers", "1"), ("SavedSetups", "n")]),
    ("Maintains",    [("Customers", "1"), ("Wishlist", "n")]),
    ("WishedFor",    [("Products", "1"), ("Wishlist", "n")]),
    ("Owns2",        [("Customers", "1"), ("Cart", "1")]),
    ("Contains2",    [("Cart", "1"), ("CartItems", "n")]),
    ("AddedAs",      [("Products", "1"), ("CartItems", "n")]),

    ("Places",       [("Customers", "1"), ("Orders", "n")]),
    ("OrderedFrom",  [("AquariumSetups", "1"), ("Orders", "n")]),
    ("Contains3",    [("Orders", "1"), ("OrderItems", "n")]),
    ("SoldAs",       [("Products", "1"), ("OrderItems", "n")]),
    ("HasDiscount",  [("Orders", "1"), ("OrderDiscounts", "n")]),
    ("AppliedVia",   [("Discounts", "1"), ("OrderDiscounts", "n")]),
    ("Receives1",    [("Orders", "1"), ("Payments", "n")]),
    ("MayHave",      [("Orders", "1"), ("Returns", "n")]),
    ("Requests",     [("Customers", "1"), ("Returns", "n")]),
    ("Processes",    [("Users", "1"), ("Returns", "n")]),
    ("Contains4",    [("Returns", "1"), ("ReturnItems", "n")]),
    ("ReturnedFrom", [("OrderItems", "1"), ("ReturnItems", "n")]),

    ("Receives2",    [("Suppliers", "1"), ("SupplierPO", "n")]),
    ("Creates2",     [("Users", "1"), ("SupplierPO", "n")]),
    ("Contains5",    [("SupplierPO", "1"), ("SupplierPOItems", "n")]),
    ("OrderedAs",    [("Products", "1"), ("SupplierPOItems", "n")]),
    ("ReceivedAs",   [("SupplierPOItems", "1"), ("StockBatches", "n")]),
    ("BatchOf",      [("Products", "1"), ("StockBatches", "n")]),
    ("Triggers",     [("Products", "1"), ("LowStockAlerts", "n")]),
    ("Resolves",     [("Users", "1"), ("LowStockAlerts", "n")]),
    ("MovementOf",   [("Products", "1"), ("InvMovements", "n")]),
    ("Performs",     [("Users", "1"), ("InvMovements", "n")]),
]

REL_DISPLAY = {
    "Has":"Has","ParentOf":"Parent Of","Categorizes":"Categorizes","Tracks":"Tracks",
    "IsA1":"Is A","IsA2":"Is A","IsA3":"Is A","IsA4":"Is A","IsA5":"Is A",
    "Creates":"Creates","UsedIn":"Used In","Contains1":"Contains","IncludedAs":"Included As",
    "RuleA":"Rule A","RuleB":"Rule B","Defines":"Defines","SavedAs":"Saved As","Owns1":"Owns",
    "Maintains":"Maintains","WishedFor":"Wished For","Owns2":"Owns","Contains2":"Contains",
    "AddedAs":"Added As","Places":"Places","OrderedFrom":"Ordered From","Contains3":"Contains",
    "SoldAs":"Sold As","HasDiscount":"Has","AppliedVia":"Applied Via","Receives1":"Receives",
    "MayHave":"May Have","Requests":"Requests","Processes":"Processes","Contains4":"Contains",
    "ReturnedFrom":"Returned From","Receives2":"Receives","Creates2":"Creates",
    "Contains5":"Contains","OrderedAs":"Ordered As","ReceivedAs":"Received As","BatchOf":"Batch Of",
    "Triggers":"Triggers","Resolves":"Resolves","MovementOf":"Movement Of","Performs":"Performs",
}

def esc(s):
    return s.replace('"', '\\"')

lines = []
lines.append('digraph ER {')
lines.append('  layout=dot;')
lines.append('  rankdir=TB;')
lines.append('  splines=polyline;')
lines.append('  nodesep=0.28;')
lines.append('  ranksep=0.6;')
lines.append('  bgcolor="white";')
lines.append('  fontname="Helvetica";')
lines.append('  node [fontname="Helvetica", fontsize=11];')
lines.append('  edge [fontname="Helvetica", fontsize=9, color="%s", penwidth=1.1, dir=none, arrowhead=none];' % EDGE_COLOR)
lines.append('')

# Entity + attribute nodes (no cluster blocks — those over-constrain rank assignment)
for ent, attrs in ENTITIES.items():
    lines.append(f'  "{ent}" [shape=box, style="rounded,filled", fillcolor="{ENTITY_FILL}", '
                  f'fontsize=13, fontname="Helvetica-Bold", margin="0.16,0.09"];')
    for i, (attr, is_pk) in enumerate(attrs):
        node_id = f'{ent}_attr_{i}'
        label = f'<<u>{esc(attr)}</u>>' if is_pk else f'"{esc(attr)}"'
        lines.append(f'  "{node_id}" [shape=ellipse, style=filled, fillcolor="{ATTR_FILL}", '
                      f'label={label}, width=0.9, height=0.42, margin="0.05,0.02"];')
        lines.append(f'  "{ent}" -> "{node_id}";')
lines.append('')

# Relationship diamonds
for rel_id, links in RELATIONSHIPS:
    label = REL_DISPLAY[rel_id]
    lines.append(f'  "{rel_id}" [shape=diamond, style=filled, fillcolor="{REL_FILL}", '
                  f'label="{esc(label)}", fontsize=10, margin="0.08,0.05"];')
    (ent1, card1), (ent2, card2) = links
    # "one" side entity feeds into the diamond, diamond feeds the "many" side —
    # gives dot a sane top-down hierarchy while edges render without arrowheads
    l1 = f' [label="{card1}", fontsize=10, fontcolor="#1d1d1f"]' if card1 else ''
    l2 = f' [label="{card2}", fontsize=10, fontcolor="#1d1d1f"]' if card2 else ''
    lines.append(f'  "{ent1}" -> "{rel_id}"{l1};')
    lines.append(f'  "{rel_id}" -> "{ent2}"{l2};')

lines.append('}')

with open('chen_er_diagram.dot', 'w') as f:
    f.write('\n'.join(lines))

print("wrote chen_er_diagram.dot")
