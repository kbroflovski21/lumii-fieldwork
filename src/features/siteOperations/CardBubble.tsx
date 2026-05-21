import { useState, useCallback } from "react";

interface CardButton {
  text: string;
  btn_type: string;
  value: string;
}

interface CardElement {
  type: string;
  content?: string;
  text?: string;
  buttons?: CardButton[];
}

export interface CardData {
  elements: CardElement[];
}

interface CardBubbleProps {
  card: CardData;
  msgId: string | number;
  onAction?: (msgId: string | number, value: string) => void;
}

export function CardBubble({ card, msgId, onAction }: CardBubbleProps) {
  const [responded, setResponded] = useState<string | null>(null);
  const [disabled, setDisabled] = useState(false);

  const handleAction = useCallback((value: string) => {
    if (disabled) return;
    setResponded(value);
    setDisabled(true);
    onAction?.(msgId, value);
    setTimeout(() => setDisabled(false), 30_000);
  }, [msgId, onAction, disabled]);

  return (
    <div className="cb-card">
      {card.elements.map((elem, i) => {
        if (elem.type === "markdown" && elem.content) {
          return <div key={i} className="cb-text">{elem.content}</div>;
        }
        if (elem.type === "divider") {
          return <hr key={i} className="cb-divider" />;
        }
        if (elem.type === "actions" && elem.buttons) {
          return (
            <div key={i} className="cb-actions">
              {elem.buttons.map((btn, j) => {
                const isSelected = responded === btn.value;
                return (
                  <button
                    key={j}
                    className={`cb-btn cb-btn--${btn.btn_type || "default"}`}
                    data-selected={isSelected}
                    disabled={disabled}
                    onClick={() => handleAction(btn.value)}
                    type="button"
                  >
                    {isSelected && "✓ "}{btn.text}
                  </button>
                );
              })}
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}
