import { io } from 'socket.io-client';

// Each mounted consumer owns its listeners; all consumers share one transport.
const connections = new Map();

export function createRealtimeClient(url, options = {}) {
  const key = `${url}:${localStorage.getItem('userId') || ''}`;
  let connection = connections.get(key);
  if (!connection) {
    connection = { socket: io(url, options), users: 0 };
    connections.set(key, connection);
  }
  connection.users += 1;
  const { socket } = connection;
  const subscriptions = new Map();
  let released = false;
  const client = {
    get connected() { return socket.connected; },
    emit(event, ...args) { if (!released) socket.emit(event, ...args); return client; },
    on(event, handler) {
      if (released) return client;
      const handlers = subscriptions.get(event) || new Set();
      if (!handlers.has(handler)) {
        handlers.add(handler);
        subscriptions.set(event, handlers);
        socket.on(event, handler);
        // A later-mounted panel must subscribe even when the portal is connected.
        if (event === 'connect' && socket.connected) queueMicrotask(() => {
          if (!released && handlers.has(handler) && socket.connected) handler();
        });
      }
      return client;
    },
    off(event, handler) {
      const handlers = subscriptions.get(event);
      if (handlers?.delete(handler)) socket.off(event, handler);
      return client;
    },
    disconnect() {
      if (released) return;
      released = true;
      subscriptions.forEach((handlers, event) => handlers.forEach(handler => socket.off(event, handler)));
      subscriptions.clear();
      connection.users -= 1;
      if (connection.users === 0) {
        socket.disconnect();
        connections.delete(key);
      }
    }
  };
  return client;
}
