"use client";
import { useState } from "react";
import { Check, X } from "lucide-react";
import { permissionGroups, permissionLabels } from "@/lib/types";

export default function PermissionMatrix({
  selected,
  editable = false,
  allowed,
}: {
  selected: string[];
  editable?: boolean;
  allowed?: string[];
}) {
  const [chosen, setChosen] = useState(selected);
  const available = permissionGroups
    .flatMap((g) => g.actions.map((a) => `${g.key}.${a}`))
    .filter((p) => !allowed || allowed.includes(p));
  return (
    <div className="permission-matrix">
      {editable && (
        <div className="permission-bulk">
          <button
            className="btn"
            type="button"
            onClick={() => setChosen(available)}
          >
            Select all
          </button>
          <button className="btn" type="button" onClick={() => setChosen([])}>
            Clear all
          </button>
          <span>
            {chosen.filter((p) => available.includes(p)).length} selected
          </span>
        </div>
      )}
      {permissionGroups.map((group) => (
        <fieldset key={group.key}>
          <legend>{group.label}</legend>
          <div className="permission-options">
            {group.actions.map((action) => {
              const permission = `${group.key}.${action}`;
              const checked = (editable ? chosen : selected).includes(
                permission,
              );
              return editable ? (
                <label key={permission}>
                  <input
                    type="checkbox"
                    name="permissions"
                    value={permission}
                    aria-label={`${group.label}: ${permissionLabels[action]}`}
                    checked={checked}
                    onChange={(e) =>
                      setChosen((old) =>
                        e.target.checked
                          ? [...old, permission]
                          : old.filter((p) => p !== permission),
                      )
                    }
                    disabled={
                      allowed !== undefined && !allowed.includes(permission)
                    }
                  />
                  {permissionLabels[action]}
                </label>
              ) : (
                <span
                  key={permission}
                  className={checked ? "" : "disabled-permission"}
                >
                  {checked ? <Check size={14} /> : <X size={14} />}
                  {permissionLabels[action]}
                </span>
              );
            })}
          </div>
        </fieldset>
      ))}
    </div>
  );
}
