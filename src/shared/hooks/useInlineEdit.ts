import { useState, useCallback, useEffect, type Dispatch, type SetStateAction } from "react";

export function useInlineEdit<T>(
  initialValue: T,
  onSave: (value: T) => Promise<void>,
): {
  editing: boolean;
  draft: T;
  setDraft: Dispatch<SetStateAction<T>>;
  startEdit: () => void;
  cancel: () => void;
  save: () => Promise<void>;
  saving: boolean;
} {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<T>(initialValue);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) setDraft(initialValue);
  }, [initialValue, editing]);

  const startEdit = useCallback(() => {
    setDraft(initialValue);
    setEditing(true);
  }, [initialValue]);

  const cancel = useCallback(() => {
    setDraft(initialValue);
    setEditing(false);
  }, [initialValue]);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      await onSave(draft);
      setEditing(false);
    } catch {
      // keep editing on failure
    } finally {
      setSaving(false);
    }
  }, [draft, onSave]);

  return { editing, draft, setDraft, startEdit, cancel, save, saving };
}
