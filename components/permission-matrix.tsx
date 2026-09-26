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
  return (
    <div className="permission-matrix">
      {permissionGroups.map((group) => (
        <fieldset key={group.key}>
          <legend>{group.label}</legend>
          <div className="permission-options">
            {group.actions.map((action) => {
              const permission = `${group.key}.${action}`;
              const checked = selected.includes(permission);
              return editable ? (
                <label key={permission}>
                  <input
                    type="checkbox"
                    name="permissions"
                    value={permission}
                    aria-label={`${group.label}: ${permissionLabels[action]}`}
                    defaultChecked={checked}
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
