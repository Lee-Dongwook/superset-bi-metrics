const {
  BACKEND_URL = 'http://localhost:8088',
  WEBSOCKET_URL = 'http://localhost:8080',
} = process.env;

export default function getProxyConfig() {
  return [
    {
      context: ['/api', '/login', '/logout', '/static'],
      target: BACKEND_URL.replace(/\/+$/, ''),
      changeOrigin: true,
      cookieDomainRewrite: '',
    },
    // Go WebSocket server (websocket/), relays core's Redis query events.
    { context: ['/ws'], target: WEBSOCKET_URL.replace(/\/+$/, ''), ws: true },
  ];
}
