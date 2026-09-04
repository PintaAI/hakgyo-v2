export type ResourcePickerType = "assessment" | "vocabulary";

export function resourcePickerQuery(
  token: string | undefined,
  returnTo: string | undefined,
) {
  if (!token) return "";
  const query = new URLSearchParams({ pickerToken: token });
  const safeReturnTo = getSafeRedirectPath(returnTo);
  if (safeReturnTo) query.set("returnTo", safeReturnTo);
  return `?${query.toString()}`;
}

export function completeResourcePicker(input: {
  resourceId: string;
  resourceType: ResourcePickerType;
  returnTo?: string;
  token?: string;
}) {
  if (!input.token || typeof window === "undefined") return false;
  const opener = window.opener as Window | null;
  if (opener && !opener.closed) {
    opener.postMessage(
      {
        type: "hakgyo:resource-created",
        token: input.token,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
      },
      window.location.origin,
    );
    opener.focus();
    window.close();
    return true;
  }
  const safeReturnTo = getSafeRedirectPath(input.returnTo);
  if (safeReturnTo) {
    window.location.assign(safeReturnTo);
    return true;
  }
  return false;
}
import { getSafeRedirectPath } from "./access";
