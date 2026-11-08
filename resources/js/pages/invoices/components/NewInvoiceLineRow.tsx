// pages/invoices/components/NewInvoiceLineRow.tsx
// سطر واحد في جدول «فاتورة جديدة»
import type React from "react";
import type { NewInvoiceLine } from "./newInvoice.types";

interface NewInvoiceLineRowProps {
    line: NewInvoiceLine;
    i: number;
    ttc: number;
    setLines: React.Dispatch<React.SetStateAction<NewInvoiceLine[]>>;
    removeLine: (i: number) => void;
}

export default function NewInvoiceLineRow({ line, i, ttc, setLines, removeLine }: NewInvoiceLineRowProps) {
    return (
        <tr
            style={{
                borderBottom: "1px solid var(--b1)",
            }}
        >
            <td
                style={{
                    padding: "8px 10px",
                    color: "var(--t4)",
                    fontSize: 11,
                }}
            >
                {i + 1}
            </td>
            <td style={{ padding: "8px 6px" }}>
                <input
                    value={line.description}
                    onChange={(e) =>
                        setLines((l) =>
                            l.map((x, idx) =>
                                idx === i
                                    ? {
                                          ...x,
                                          description:
                                              e
                                                  .target
                                                  .value,
                                      }
                                    : x,
                            ),
                        )
                    }
                    placeholder="اسم المنتج أو الخدمة"
                    style={{
                        width: "100%",
                        minWidth: 160,
                    }}
                />
            </td>
            <td style={{ padding: "8px 6px" }}>
                <input
                    type="number"
                    value={line.quantity}
                    min={0.001}
                    style={{
                        width: 65,
                        textAlign: "center",
                    }}
                    onChange={(e) =>
                        setLines((l) =>
                            l.map((x, idx) =>
                                idx === i
                                    ? {
                                          ...x,
                                          quantity:
                                              +e
                                                  .target
                                                  .value,
                                      }
                                    : x,
                            ),
                        )
                    }
                />
            </td>
            <td style={{ padding: "8px 6px" }}>
                <input
                    type="number"
                    value={line.unit_price_ht}
                    min={0}
                    style={{ width: 90 }}
                    onChange={(e) =>
                        setLines((l) =>
                            l.map((x, idx) =>
                                idx === i
                                    ? {
                                          ...x,
                                          unit_price_ht:
                                              +e
                                                  .target
                                                  .value,
                                      }
                                    : x,
                            ),
                        )
                    }
                />
            </td>
            <td style={{ padding: "8px 6px" }}>
                <select
                    style={{ width: 72 }}
                    value={line.tva_rate}
                    onChange={(e) =>
                        setLines((l) =>
                            l.map((x, idx) =>
                                idx === i
                                    ? {
                                          ...x,
                                          tva_rate:
                                              +e
                                                  .target
                                                  .value,
                                      }
                                    : x,
                            ),
                        )
                    }
                >
                    <option value={19}>19%</option>
                    <option value={9}>9%</option>
                    <option value={0}>0%</option>
                </select>
            </td>
            <td style={{ padding: "8px 6px" }}>
                <input
                    type="number"
                    value={line.discount_percentage}
                    min={0}
                    max={100}
                    style={{
                        width: 65,
                        textAlign: "center",
                    }}
                    onChange={(e) =>
                        setLines((l) =>
                            l.map((x, idx) =>
                                idx === i
                                    ? {
                                          ...x,
                                          discount_percentage:
                                              +e
                                                  .target
                                                  .value,
                                      }
                                    : x,
                            ),
                        )
                    }
                />
            </td>
            <td
                style={{
                    padding: "8px 10px",
                    color: "var(--em)",
                    fontWeight: 700,
                    fontFamily: "monospace",
                    whiteSpace: "nowrap",
                }}
            >
                {ttc.toLocaleString("fr-DZ", {
                    maximumFractionDigits: 0,
                })}{" "}
                دج
            </td>
            <td style={{ padding: "8px 6px" }}>
                <button
                    className="btn btn-xs"
                    style={{
                        background: "transparent",
                        border: "none",
                        color: "var(--red)",
                    }}
                    onClick={() => removeLine(i)}
                >
                    <span className="ic ic-xs">
                        <i className="ti ti-trash" />
                    </span>
                </button>
            </td>
        </tr>
    );
}
