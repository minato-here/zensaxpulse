import React, { useEffect } from "react";
import { AlertTriangle, X } from "lucide-react";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  isDestructive = false,
  onConfirm,
  onCancel,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onCancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="dialog-overlay"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0, 0, 0, 0.72)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "20px",
      }}
      onClick={onCancel}
    >
      <div
        className="dialog-content"
        style={{
          width: "100%",
          maxWidth: "460px",
          background: "var(--surface, #1d202b)",
          border: "1px solid var(--border)",
          borderRadius: "16px",
          padding: "24px",
          boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
          color: "var(--text-primary)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: "16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "10px",
                background: isDestructive
                  ? "rgba(239, 68, 68, 0.15)"
                  : "var(--accent-soft)",
                display: "grid",
                placeItems: "center",
                color: isDestructive ? "#ef4444" : "var(--accent)",
              }}
            >
              <AlertTriangle size={20} />
            </div>
            <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 700 }}>
              {title}
            </h3>
          </div>

          <button
            onClick={onCancel}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-muted)",
              padding: "4px",
              display: "grid",
              placeItems: "center",
              borderRadius: "6px",
            }}
          >
            <X size={18} />
          </button>
        </div>

        <p
          style={{
            margin: "0 0 24px",
            fontSize: "13px",
            color: "var(--text-secondary)",
            lineHeight: 1.6,
          }}
        >
          {message}
        </p>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "10px",
          }}
        >
          <button
            onClick={onCancel}
            style={{
              padding: "9px 18px",
              borderRadius: "10px",
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--text-primary)",
              fontWeight: 600,
              fontSize: "13px",
            }}
          >
            {cancelLabel}
          </button>

          <button
            onClick={onConfirm}
            style={{
              padding: "9px 20px",
              borderRadius: "10px",
              border: "none",
              background: isDestructive ? "#ef4444" : "var(--accent)",
              color: isDestructive ? "#ffffff" : "#0d1117",
              fontWeight: 700,
              fontSize: "13px",
              cursor: "pointer",
              boxShadow: isDestructive
                ? "0 4px 12px rgba(239, 68, 68, 0.35)"
                : "0 4px 12px rgba(34, 197, 94, 0.3)",
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

