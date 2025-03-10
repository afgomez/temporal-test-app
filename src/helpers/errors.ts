export function isHTTPClientError(status: number): boolean {
  return status >= 400 && status < 500;
}
