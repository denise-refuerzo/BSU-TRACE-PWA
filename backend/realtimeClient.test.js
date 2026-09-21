const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { Server } = require('socket.io');

test('portal and floating chat share a socket, rejoin after reconnect, and clean up independently', async () => {
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => 'test-user' } });
  const { createRealtimeClient } = await import('../frontend/src/utils/realtimeClient.js');
  const server = http.createServer();
  const io = new Server(server);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let connections = 0;
  let serverSocket;
  io.on('connection', socket => {
    connections += 1;
    serverSocket = socket;
    socket.on('join-chat-channel', room => {
      socket.join(`chat_${room}`);
      socket.emit('room-ready', room);
    });
  });
  const url = `http://127.0.0.1:${server.address().port}`;
  const portal = createRealtimeClient(url, { reconnectionDelay: 10, reconnectionDelayMax: 20, randomizationFactor: 0 });
  const once = (client, event) => new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { client.off(event, receive); reject(new Error(`Timed out: ${event}`)); }, 3000);
    const receive = value => { clearTimeout(timeout); client.off(event, receive); resolve(value); };
    client.on(event, receive);
  });
  let panel;
  try {
    await once(portal, 'connect');
    panel = createRealtimeClient(url);
    const joined = once(panel, 'room-ready');
    panel.on('connect', () => panel.emit('join-chat-channel', 12));
    assert.equal(await joined, 12, 'late panel joins an already connected transport');
    assert.equal(connections, 1, 'only one physical connection');

    const received = once(panel, 'new-chat-message');
    io.to('chat_12').emit('new-chat-message', { message_id: 1 });
    assert.deepEqual(await received, { message_id: 1 });

    const rejoined = once(panel, 'room-ready');
    serverSocket.conn.close();
    assert.equal(await rejoined, 12, 'active conversation rejoins after connection loss');
    assert.equal(connections, 2);

    let closedPanelEvents = 0;
    panel.on('chat-badge-updated', () => { closedPanelEvents += 1; });
    panel.disconnect();
    const badge = once(portal, 'chat-badge-updated');
    io.emit('chat-badge-updated', 'refresh');
    assert.equal(await badge, 'refresh', 'portal continues receiving badge events after chat closes');
    assert.equal(closedPanelEvents, 0, 'closed chat listeners are removed');
    assert.equal(portal.connected, true);
  } finally {
    panel?.disconnect();
    portal.disconnect();
    await new Promise(resolve => io.close(resolve));
    delete globalThis.localStorage;
  }
});
