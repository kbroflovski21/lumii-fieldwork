import React, { useState, useCallback } from "react";

interface CommandInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
  placeholder?: string;
  compact?: boolean;
}

export function CommandInput({ onSend, disabled, placeholder, compact }: CommandInputProps) {
  const [value, setValue] = useState("");

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim() || disabled) return;
    onSend(value.trim());
    setValue("");
  }, [value, disabled, onSend]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  }, [handleSubmit]);

  return (
    <form className={`command-input ${compact ? "command-input--compact" : ""}`} onSubmit={handleSubmit}>
      <input
        type="text"
        className="command-input__field"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder ?? "问我任何问题..."}
        disabled={disabled}
      />
      <button
        type="submit"
        className="command-input__send"
        disabled={disabled || !value.trim()}
        aria-label="发送"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
        </svg>
      </button>
    </form>
  );
}
