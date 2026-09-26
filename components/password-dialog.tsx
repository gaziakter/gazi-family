"use client";
import PasswordInput from "./password-input";
import { useState, type FormEvent } from "react";
import { X, LockKeyhole, Check } from "lucide-react";
export default function PasswordDialog({ close }: { close: () => void }) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [done, setDone] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const values = Object.fromEntries(new FormData(e.currentTarget));
    if (values.password !== values.confirm) {
      setError("New passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const b = await response.json();
      if (!response.ok) throw Error(b.error);
      setDone(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="modal-backdrop">
      <form
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="password-title"
        onSubmit={submit}
      >
        <div className="modal-heading">
          <h2 id="password-title">Change password</h2>
          <button type="button" onClick={close} aria-label="Close">
            <X size={20} />
          </button>
        </div>
        {done ? (
          <div className="empty">
            <Check />
            <h3>Password updated</h3>
            <p>Your other sessions have been signed out.</p>
            <button className="btn primary" type="button" onClick={close}>
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="form-fields">
              <label>
                Current password
                <PasswordInput
                  autoFocus
                  name="currentPassword"
                  required
                  maxLength={128}
                  autoComplete="current-password"
                />
              </label>
              <label>
                New password
                <PasswordInput
                  name="password"
                  required
                  minLength={10}
                  maxLength={128}
                  autoComplete="new-password"
                />
              </label>
              <label>
                Confirm new password
                <PasswordInput
                  name="confirm"
                  required
                  minLength={10}
                  maxLength={128}
                  autoComplete="new-password"
                />
              </label>
            </div>
            {error && (
              <div className="error" role="alert">
                {error}
              </div>
            )}
            <div className="modal-actions">
              <button className="btn" type="button" onClick={close}>
                Cancel
              </button>
              <button className="btn primary" disabled={busy}>
                <LockKeyhole size={16} />
                Update password
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
