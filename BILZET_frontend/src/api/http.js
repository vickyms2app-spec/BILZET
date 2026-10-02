import axios from "axios";
const API =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? "/api/v1" : "http://localhost:5000/api/v1");
export const http = axios.create({
  baseURL: API,
  timeout: 5000,
  headers: { "Content-Type": "application/json" },
});
let accessToken = localStorage.getItem("bilzet_access_token");
export function setTokens(a, r) {
  accessToken = a || null;
  if (a) localStorage.setItem("bilzet_access_token", a);
  else localStorage.removeItem("bilzet_access_token");
  if (r) localStorage.setItem("bilzet_refresh_token", r);
  else if (!a) localStorage.removeItem("bilzet_refresh_token");
}
http.interceptors.request.use((c) => {
  if (accessToken) c.headers.Authorization = `Bearer ${accessToken}`;
  return c;
});
let refreshing = null;
http.interceptors.response.use(
  (r) => r,
  async (e) => {
    const original = e.config;
    if (
      e.response?.status === 401 &&
      !original._retry &&
      localStorage.getItem("bilzet_refresh_token")
    ) {
      original._retry = true;
      try {
        refreshing ??= axios.post(`${API}/auth/refresh`, {
          refreshToken: localStorage.getItem("bilzet_refresh_token"),
        });
        const { data } = await refreshing;
        refreshing = null;
        setTokens(data.data.accessToken, data.data.refreshToken);
        original.headers.Authorization = `Bearer ${data.data.accessToken}`;
        return http(original);
      } catch (err) {
        refreshing = null;
        setTokens();
        throw err;
      }
    }
    throw e;
  },
);
export function apiError(e) {
  return (
    e?.response?.data?.message ||
    e?.response?.data?.errors?.[0]?.message ||
    e?.message ||
    "Something went wrong"
  );
}
export { API };
