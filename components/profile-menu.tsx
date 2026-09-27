"use client";

import { useEffect, useRef, useState } from "react";
import { LogOut, Settings, X, LockKeyhole, ChevronDown } from "lucide-react";

export default function ProfileMenu({
  name,
  email,
  demo,
  onPassword,
  onSignout,
}: {
  name: string;
  email: string;
  demo: boolean;
  onPassword: () => void;
  onSignout: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState(false);
  const [busy, setBusy] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [open]);

  useEffect(() => {
    if (settings)
      panel.current?.querySelector<HTMLButtonElement>("button")?.focus();
  }, [settings]);

  function closeSettings() {
    setSettings(false);
    trigger.current?.focus();
  }

  return (
    <div
      className="profile-menu"
      ref={root}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          setOpen(false);
          closeSettings();
        }
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        ref={trigger}
        type="button"
        className="profile-trigger"
        aria-label={`Account menu for ${name}`}
        aria-expanded={open}
        aria-controls="account-menu"
        onClick={() => setOpen(!open)}
      >
        <span className="top-avatar" aria-hidden="true">{name[0]}</span>
        <span className="profile-trigger-name" title={name}>{name}</span>
        <ChevronDown size={16} className="profile-trigger-arrow" aria-hidden="true" />
      </button>
      {open && (
        <div id="account-menu" className="profile-dropdown">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setSettings(true);
            }}
          >
            <Settings size={17} /> Setting
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onSignout();
              } finally {
                setBusy(false);
                setOpen(false);
              }
            }}
          >
            <LogOut size={17} /> {busy ? "Signing out..." : "Signout"}
          </button>
        </div>
      )}
      {settings && (
        <div
          className="modal-backdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget) closeSettings();
          }}
        >
          <div
            className="modal"
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby="account-settings-title"
            onKeyDown={(event) => {
              if (event.key !== "Tab") return;
              const buttons =
                panel.current?.querySelectorAll<HTMLButtonElement>(
                  "button:not(:disabled)",
                );
              if (!buttons?.length) return;
              const first = buttons[0],
                last = buttons[buttons.length - 1];
              if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
              }
              if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
              }
            }}
          >
            <div className="modal-heading">
              <h2 id="account-settings-title">Setting</h2>
              <button
                type="button"
                aria-label="Close settings"
                onClick={closeSettings}
              >
                <X size={20} />
              </button>
            </div>
            <div className="form-fields">
              <div>
                <strong>{name}</strong>
                <p>{email}</p>
              </div>
              {demo ? (
                <p>
                  Password management is available in the connected workspace.
                </p>
              ) : (
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    setSettings(false);
                    onPassword();
                  }}
                >
                  <LockKeyhole size={17} /> Change password
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
