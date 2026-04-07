/** Cookie helpers scoped to the LeetCode tracker */

const LC_COOKIE_PREFIX = "lc_";

export function setCookie(name, value, days = 365) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

export function getCookie(name) {
  const match = document.cookie
    .split("; ")
    .find(row => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split("=")[1]) : null;
}

export function deleteCookie(name) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax`;
}

/** Remove all cookies that start with the "lc_" prefix */
export function clearAllLCCookies() {
  document.cookie.split("; ").forEach(row => {
    const name = row.split("=")[0];
    if (name.startsWith(LC_COOKIE_PREFIX)) deleteCookie(name);
  });
}

export function getLCCookieNames() {
  return document.cookie
    .split("; ")
    .map(row => row.split("=")[0])
    .filter(name => name.startsWith(LC_COOKIE_PREFIX));
}
