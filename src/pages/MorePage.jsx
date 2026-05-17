import { useState } from "react";
import { useApp } from "../context/AppContext";
import { CAD, fmtDate, fmtTime } from "../utils/format";
import BottomSheet from "../components/BottomSheet";
import { newId } from "../utils/ids";

const UNITS = ["kg", "pcs", "bunch", "box", "bag", "crate", "lbs"];
const emptyItem = () => ({
  id: newId(),
  name: "",
  qty: "",
  unit: "kg",
  cost: "",
});

export default function MorePage() {
  const {
    settings,
    setSettings,
    purchases,
    addPurchase,
    markPurchasePaid,
    deletePurchase,
    sales,
    payments,
  } = useApp();

  const [tab, setTab] = useState("purchases");
  const [nameEdit, setNameEdit] = useState(false);
  const [vendorInput, setVendorInput] = useState(settings.vendorName);
  const [waModeInput, setWaModeInput] = useState(
    settings.whatsappMode || "personal",
  );
  const [waApiUrlInput, setWaApiUrlInput] = useState(
    settings.whatsappApiUrl || "",
  );
  const [waApiTokenInput, setWaApiTokenInput] = useState(
    settings.whatsappApiToken || "",
  );
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [histTab, setHistTab] = useState("all");

  // new purchase form
  const [supplier, setSupplier] = useState("");
  const [pItems, setPItems] = useState([emptyItem()]);
  const [pPaid, setPPaid] = useState("");
  const [pNote, setPNote] = useState("");

  const updatePItem = (id, field, value) =>
    setPItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, [field]: value } : i)),
    );
  const removePItem = (id) =>
    setPItems((prev) => prev.filter((i) => i.id !== id));
  const addPItem = () => setPItems((prev) => [...prev, emptyItem()]);

  const pLineTotal = (i) =>
    (parseFloat(i.qty) || 0) * (parseFloat(i.cost) || 0);
  const pTotal = pItems.reduce((a, i) => a + pLineTotal(i), 0);

  const handleSavePurchase = () => {
    if (!supplier.trim()) return;
    const validItems = pItems.filter((i) => i.name.trim() && pLineTotal(i) > 0);
    if (validItems.length === 0) return;
    const paid = Math.min(parseFloat(pPaid) || 0, pTotal);
    addPurchase({
      supplierName: supplier.trim(),
      items: validItems,
      total: pTotal,
      amountPaid: paid,
      note: pNote.trim(),
    });
    setSupplier("");
    setPItems([emptyItem()]);
    setPPaid("");
    setPNote("");
    setPurchaseOpen(false);
  };

  const handleSaveName = () => {
    setSettings({
      ...settings,
      vendorName: vendorInput.trim() || settings.vendorName,
    });
    setNameEdit(false);
  };

  const handleSaveWhatsApp = () => {
    setSettings({
      ...settings,
      whatsappMode: waModeInput,
      whatsappApiUrl: waApiUrlInput.trim(),
      whatsappApiToken: waApiTokenInput.trim(),
    });
  };

  // history
  const allHistory = [
    ...sales.map((s) => ({ ...s, kind: "sale" })),
    ...purchases.map((p) => ({ ...p, kind: "purchase" })),
    ...payments.map((p) => ({ ...p, kind: "payment" })),
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const filteredHistory =
    histTab === "all"
      ? allHistory
      : allHistory.filter((h) => h.kind === histTab);

  return (
    <div className="page">
      <div className="page-header page-header--green">
        <h2 className="page-title">More</h2>
      </div>

      <div className="page-body">
        {/* Settings */}
        <div className="more-section">
          <p className="more-section-title">Settings</p>
          <div className="settings-card">
            <div className="settings-row">
              <div>
                <p className="settings-label">Vendor name</p>
                {nameEdit ? (
                  <div className="settings-edit-row">
                    <input
                      className="form-input settings-name-input"
                      value={vendorInput}
                      onChange={(e) => setVendorInput(e.target.value)}
                      autoFocus
                      onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                    />
                    <button
                      className="btn btn--sm btn--primary"
                      onClick={handleSaveName}
                    >
                      Save
                    </button>
                    <button
                      className="btn btn--sm btn--ghost"
                      onClick={() => {
                        setNameEdit(false);
                        setVendorInput(settings.vendorName);
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <p className="settings-value">{settings.vendorName}</p>
                )}
              </div>
              {!nameEdit && (
                <button
                  className="btn btn--sm btn--outline"
                  onClick={() => setNameEdit(true)}
                >
                  Edit
                </button>
              )}
            </div>

            <div className="settings-stack">
              <p className="settings-label">WhatsApp send mode</p>
              <select
                className="form-select"
                value={waModeInput}
                onChange={(e) => setWaModeInput(e.target.value)}
              >
                <option value="personal">
                  Personal WhatsApp (current device)
                </option>
                <option value="business-api">Verified Business API</option>
              </select>
              <p className="settings-help">
                Use Business API mode to send from your verified business
                number.
              </p>
            </div>

            {waModeInput === "business-api" && (
              <>
                <div className="settings-stack">
                  <p className="settings-label">Business API endpoint</p>
                  <input
                    className="form-input"
                    placeholder="https://your-server.com/api/whatsapp/todays-prices"
                    value={waApiUrlInput}
                    onChange={(e) => setWaApiUrlInput(e.target.value)}
                  />
                </div>
                <div className="settings-stack">
                  <p className="settings-label">
                    API bearer token{" "}
                    <span className="form-label-opt">(optional)</span>
                  </p>
                  <input
                    className="form-input"
                    placeholder="Optional token"
                    value={waApiTokenInput}
                    onChange={(e) => setWaApiTokenInput(e.target.value)}
                  />
                </div>
              </>
            )}

            <button
              className="btn btn--sm btn--primary"
              onClick={handleSaveWhatsApp}
            >
              Save WhatsApp Settings
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="more-tabs">
          <button
            className={`more-tab ${tab === "purchases" ? "more-tab--active" : ""}`}
            onClick={() => setTab("purchases")}
          >
            Purchases
          </button>
          <button
            className={`more-tab ${tab === "history" ? "more-tab--active" : ""}`}
            onClick={() => setTab("history")}
          >
            History
          </button>
        </div>

        {tab === "purchases" && (
          <div className="more-section">
            <div className="more-section-header">
              <p className="more-section-title">From Suppliers</p>
              <button
                className="btn btn--sm btn--primary"
                onClick={() => setPurchaseOpen(true)}
              >
                + Add
              </button>
            </div>
            {purchases.length === 0 ? (
              <p className="empty-state">No purchases recorded yet.</p>
            ) : (
              <div className="purchase-list">
                {purchases.map((p) => (
                  <div key={p.id} className="purchase-card">
                    <div className="purchase-top">
                      <span className="purchase-supplier">
                        {p.supplierName}
                      </span>
                      <span className="purchase-total">{CAD(p.total)}</span>
                    </div>
                    <div className="purchase-mid">
                      <span className="purchase-items">
                        {p.items.map((i) => i.name).join(", ")}
                      </span>
                      <span
                        className={`badge badge--${p.total > p.amountPaid ? "pending" : "paid"}`}
                      >
                        {p.total > p.amountPaid ? "pending" : "paid"}
                      </span>
                    </div>
                    <div className="purchase-actions">
                      <span className="purchase-date">
                        {fmtDate(p.createdAt)}
                      </span>
                      <div style={{ display: "flex", gap: 6 }}>
                        {p.total > p.amountPaid && (
                          <button
                            className="btn btn--sm btn--outline"
                            onClick={() => markPurchasePaid(p.id)}
                          >
                            Mark paid
                          </button>
                        )}
                        <button
                          className="btn btn--sm btn--danger-ghost"
                          onClick={() => deletePurchase(p.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "history" && (
          <div className="more-section">
            <div className="hist-tabs">
              {["all", "sale", "purchase", "payment"].map((t) => (
                <button
                  key={t}
                  className={`hist-tab ${histTab === t ? "hist-tab--active" : ""}`}
                  onClick={() => setHistTab(t)}
                >
                  {t === "all"
                    ? "All"
                    : t.charAt(0).toUpperCase() + t.slice(1) + "s"}
                </button>
              ))}
            </div>
            {filteredHistory.length === 0 ? (
              <p className="empty-state">No records found.</p>
            ) : (
              <div className="history-list">
                {filteredHistory.map((item) => (
                  <HistoryRow key={item.id} item={item} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add purchase sheet */}
      <BottomSheet
        open={purchaseOpen}
        onClose={() => setPurchaseOpen(false)}
        title="Add Purchase"
      >
        <div className="form-group">
          <label className="form-label">Supplier name *</label>
          <input
            className="form-input"
            placeholder="e.g. Metro Wholesale"
            value={supplier}
            onChange={(e) => setSupplier(e.target.value)}
            autoFocus
          />
        </div>
        <div className="form-group">
          <label className="form-label">Items</label>
          {pItems.map((item, idx) => (
            <div
              key={item.id}
              className="line-item"
              style={{ marginBottom: 10 }}
            >
              <div className="line-item-top">
                <input
                  className="form-input line-item-name"
                  placeholder={`Item ${idx + 1}`}
                  value={item.name}
                  onChange={(e) => updatePItem(item.id, "name", e.target.value)}
                />
                {pItems.length > 1 && (
                  <button
                    className="item-del"
                    onClick={() => removePItem(item.id)}
                  >
                    <IconX />
                  </button>
                )}
              </div>
              <div className="line-item-row">
                <input
                  className="form-input line-item-qty"
                  placeholder="Qty"
                  type="number"
                  inputMode="decimal"
                  value={item.qty}
                  onChange={(e) => updatePItem(item.id, "qty", e.target.value)}
                />
                <select
                  className="form-select line-item-unit"
                  value={item.unit}
                  onChange={(e) => updatePItem(item.id, "unit", e.target.value)}
                >
                  {UNITS.map((u) => (
                    <option key={u}>{u}</option>
                  ))}
                </select>
                <input
                  className="form-input line-item-price"
                  placeholder="$/unit"
                  type="number"
                  inputMode="decimal"
                  value={item.cost}
                  onChange={(e) => updatePItem(item.id, "cost", e.target.value)}
                />
                <span className="line-total">
                  {pLineTotal(item) > 0 ? CAD(pLineTotal(item)) : "—"}
                </span>
              </div>
            </div>
          ))}
          <button className="btn btn--add-item" onClick={addPItem}>
            + Add item
          </button>
        </div>
        <div className="form-group">
          <label className="form-label">Amount paid now</label>
          <input
            className="form-input"
            type="number"
            inputMode="decimal"
            placeholder="0"
            value={pPaid}
            onChange={(e) => setPPaid(e.target.value)}
          />
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            <button
              className="quick-btn"
              onClick={() => setPPaid(String(pTotal))}
            >
              Full cash
            </button>
            <button className="quick-btn" onClick={() => setPPaid("0")}>
              All credit
            </button>
          </div>
        </div>
        {pTotal > 0 && (
          <p className="sheet-sub" style={{ textAlign: "right" }}>
            Total: <strong>{CAD(pTotal)}</strong>
          </p>
        )}
        <div className="form-group">
          <label className="form-label">
            Note <span className="form-label-opt">(optional)</span>
          </label>
          <input
            className="form-input"
            placeholder="e.g. weekly order"
            value={pNote}
            onChange={(e) => setPNote(e.target.value)}
          />
        </div>
        <button
          className="btn btn--primary btn--full"
          onClick={handleSavePurchase}
        >
          Save Purchase {pTotal > 0 ? `· ${CAD(pTotal)}` : ""}
        </button>
      </BottomSheet>
    </div>
  );
}

function HistoryRow({ item }) {
  if (item.kind === "sale") {
    const credit = item.total - item.amountPaid;
    return (
      <div className="history-row history-row--sale">
        <div className="history-icon history-icon--sale">
          <IconUp />
        </div>
        <div className="history-body">
          <div className="history-top">
            <span className="history-label">{item.buyerName}</span>
            <span className="history-amount history-amount--sale">
              +{CAD(item.total)}
            </span>
          </div>
          <div className="history-mid">
            <span className="history-sub">
              {item.items.map((i) => i.name).join(", ")}
            </span>
            <span className={`badge badge--${credit > 0 ? "pending" : "paid"}`}>
              {credit > 0 ? "credit" : "paid"}
            </span>
          </div>
          <span className="history-date">
            {fmtDate(item.createdAt)} · {fmtTime(item.createdAt)}
          </span>
        </div>
      </div>
    );
  }
  if (item.kind === "purchase") {
    return (
      <div className="history-row history-row--purchase">
        <div className="history-icon history-icon--purchase">
          <IconDown />
        </div>
        <div className="history-body">
          <div className="history-top">
            <span className="history-label">{item.supplierName}</span>
            <span className="history-amount history-amount--purchase">
              −{CAD(item.total)}
            </span>
          </div>
          <div className="history-mid">
            <span className="history-sub">
              {item.items.map((i) => i.name).join(", ")}
            </span>
            <span
              className={`badge badge--${item.total > item.amountPaid ? "pending" : "paid"}`}
            >
              {item.total > item.amountPaid ? "pending" : "paid"}
            </span>
          </div>
          <span className="history-date">
            {fmtDate(item.createdAt)} · {fmtTime(item.createdAt)}
          </span>
        </div>
      </div>
    );
  }
  return (
    <div className="history-row history-row--payment">
      <div className="history-icon history-icon--payment">
        <IconCash />
      </div>
      <div className="history-body">
        <div className="history-top">
          <span className="history-label">{item.buyerName}</span>
          <span className="history-amount history-amount--payment">
            −{CAD(item.amount)}
          </span>
        </div>
        <span className="history-date">
          {fmtDate(item.createdAt)} · {fmtTime(item.createdAt)}
        </span>
      </div>
    </div>
  );
}

function IconX() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
function IconUp() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  );
}
function IconDown() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 5v14M19 12l-7 7-7-7" />
    </svg>
  );
}
function IconCash() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
    </svg>
  );
}
