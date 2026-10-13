/** Hidden is the default. Only `hidden=0` reveals amounts. */
export function hideValuesFromSearchParam(hidden?: string): boolean {
  return hidden !== "0"
}
