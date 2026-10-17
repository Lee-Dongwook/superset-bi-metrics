import { RealtimeClient, type QueryEvent } from './realtime';

const event = (query_id: string, status: QueryEvent['status']) =>
  JSON.stringify({
    channel_id: 'c',
    query_id,
    status,
    stage: null,
    result_url: null,
    error: null,
  });

test('routes Go server events to the subscribers of their query_id', () => {
  const sockets: { url: string }[] = [];
  (globalThis as any).WebSocket = class {
    constructor(public url: string) {
      sockets.push(this);
    }
    close() {}
  };

  const client = new RealtimeClient();
  const seen: string[] = [];
  const unsubscribe = client.subscribe('1', e => seen.push(e.status));
  client.subscribe('2', () => seen.push('wrong query'));

  // Subscribing connects once, with this tab's channel_id for core to publish to.
  expect(sockets).toHaveLength(1);
  const url = new URL(sockets[0].url);
  expect(url.protocol).toBe('ws:');
  expect(url.pathname).toBe('/ws');
  expect(url.searchParams.get('channel_id')).toBe(client.channelId);

  client.dispatchMessage(event('1', 'RUNNING'));
  client.dispatchMessage('{"action":"pong"}');
  client.dispatchMessage('not json');
  unsubscribe();
  client.dispatchMessage(event('1', 'SUCCESS'));

  expect(seen).toEqual(['RUNNING']);
  client.disconnect();
});
