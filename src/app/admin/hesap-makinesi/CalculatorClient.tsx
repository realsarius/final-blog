"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./page.module.css";

type HistoryEntry = {
  expression: string;
  result: string;
};

type CalculatorMessages = {
  title: string;
  subtitle: string;
  error: string;
  history: string;
  clear: string;
  noHistory: string;
};

type CalculatorClientProps = {
  messages: Readonly<CalculatorMessages>;
};

const HISTORY_KEY = "finalblog-admin-calculator-history-v1";

const BUTTONS: Array<Array<{ label: string; value?: string; action?: "clear" | "delete" | "calc" }>> = [
  [
    { label: "AC", action: "clear" },
    { label: "⌫", action: "delete" },
    { label: "%", value: "%" },
    { label: "÷", value: "÷" },
  ],
  [
    { label: "7", value: "7" },
    { label: "8", value: "8" },
    { label: "9", value: "9" },
    { label: "×", value: "×" },
  ],
  [
    { label: "4", value: "4" },
    { label: "5", value: "5" },
    { label: "6", value: "6" },
    { label: "-", value: "-" },
  ],
  [
    { label: "1", value: "1" },
    { label: "2", value: "2" },
    { label: "3", value: "3" },
    { label: "+", value: "+" },
  ],
  [
    { label: "(", value: "(" },
    { label: "0", value: "0" },
    { label: ")", value: ")" },
    { label: "=", action: "calc" },
  ],
];

function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const parsed = raw ? (JSON.parse(raw) as HistoryEntry[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveHistory(history: HistoryEntry[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 20)));
}

function normalizeExpression(raw: string) {
  return raw
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/(\d+(\.\d+)?)%/g, "($1/100)");
}

function evaluateExpression(raw: string, errorText: string) {
  try {
    const normalized = normalizeExpression(raw);
    if (!/^[0-9+\-*/().\s]+$/.test(normalized)) {
      return errorText;
    }
    const result = Function(`"use strict"; return (${normalized});`)() as number;
    if (typeof result !== "number" || !Number.isFinite(result)) {
      return errorText;
    }
    return parseFloat(result.toPrecision(12)).toString();
  } catch {
    return errorText;
  }
}

export default function CalculatorClient({ messages }: CalculatorClientProps) {
  const [expression, setExpression] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    if (typeof window === "undefined") {
      return [];
    }
    return loadHistory();
  });
  const firstPersistRef = useRef(true);

  useEffect(() => {
    if (firstPersistRef.current) {
      firstPersistRef.current = false;
      return;
    }
    saveHistory(history);
  }, [history]);

  const preview = useMemo(() => {
    if (!expression) {
      return "";
    }
    const result = evaluateExpression(expression, messages.error);
    return result === messages.error ? "" : result;
  }, [expression, messages.error]);

  const handleAction = (button: { label: string; value?: string; action?: "clear" | "delete" | "calc" }) => {
    if (button.value !== undefined) {
      setExpression((prev) => prev + button.value);
      return;
    }

    if (button.action === "clear") {
      setExpression("");
      return;
    }

    if (button.action === "delete") {
      setExpression((prev) => prev.slice(0, -1));
      return;
    }

    if (button.action === "calc") {
      if (!expression) {
        return;
      }
      const result = evaluateExpression(expression, messages.error);
      setHistory((prev) => [{ expression, result }, ...prev]);
      if (result !== messages.error) {
        setExpression(result);
      }
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>{messages.title}</h1>
        <p>{messages.subtitle}</p>
      </header>

      <div className={styles.layout}>
        <section className={styles.calculator}>
          <div className={styles.display}>
            <span>{preview ? `= ${preview}` : "\u00A0"}</span>
            <strong>{expression || "0"}</strong>
          </div>

          <div className={styles.keypad}>
            {BUTTONS.flat().map((button) => (
              <button
                key={button.label}
                type="button"
                className={`${styles.key} ${button.action === "calc" ? styles.keyPrimary : ""}`}
                onClick={() => handleAction(button)}
              >
                {button.label}
              </button>
            ))}
          </div>
        </section>

        <aside className={styles.history}>
          <div className={styles.historyHeader}>
            <h2>{messages.history}</h2>
            <button type="button" className={styles.clearHistory} onClick={() => setHistory([])}>
              {messages.clear}
            </button>
          </div>

          {history.length === 0 ? (
            <p className={styles.empty}>{messages.noHistory}</p>
          ) : (
            <div className={styles.historyList}>
              {history.map((item, index) => (
                <button
                  key={`${item.expression}-${index}`}
                  type="button"
                  className={styles.historyItem}
                  onClick={() => setExpression(item.result !== messages.error ? item.result : item.expression)}
                >
                  <span>{item.expression}</span>
                  <strong>= {item.result}</strong>
                </button>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
