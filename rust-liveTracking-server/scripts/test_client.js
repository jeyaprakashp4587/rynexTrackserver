const WebSocket = globalThis.WebSocket;

if (!WebSocket) {
  throw new Error("WebSocket is not available in this runtime");
}

const args = process.argv.slice(2);
const url = args[0] || "ws://127.0.0.1:8080/ws?token=demo";
const ws = new WebSocket(url);

ws.onopen = () => {
  console.log("connected");
  ws.send(JSON.stringify({ type: "join_trip", trip_id: "trip-demo" }));
  ws.send(JSON.stringify({ type: "ping" }));
};

ws.onmessage = (event) => {
  console.log("message:", event.data);
};

ws.onclose = (event) => {
  console.log("closed", event.code, event.reason);
};

ws.onerror = (error) => {
  console.error("socket error", error);
};
