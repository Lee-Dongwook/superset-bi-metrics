const { BACKEND_URL = "http://localhost:8088" } = process.env;

export default function getProxyConfig() {
  return {
    context: ["/api", "/login", "/logout", "/static"],
    target: BACKEND_URL.replace(/\/+$/, ""),
    changeOrigin: true,
    cookieDomainRewrite: "",
  };
}
