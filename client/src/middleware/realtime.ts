/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { logging } from '@bi-metrics/core/utils';

// Mirrors core/semantic/types.py CubeQueryEvent, as relayed verbatim by the Go WebSocket server.
export interface QueryEvent {
  channel_id: string;
  query_id: string;
  status:
    | 'PENDING'
    | 'RUNNING'
    | 'SUCCESS'
    | 'FAILED'
    | 'TIMED_OUT'
    | 'STOPPED';
  stage: {
    step: string;
    description: string;
    progress_percent: number;
    elapsed_ms: number;
  } | null;
  result_url: string | null;
  error: string | null;
}

export type RealtimeHandler = (event: QueryEvent) => void;

export type RealtimeConfig = {
  // Proxied to the Go server (:8080) by webpack.proxy-config.js in dev.
  WEBSOCKET_URL?: string;
};

export type RealtimeOpenReason = 'initial' | 'reconnect';
export type RealtimeOpenListener = (reason: RealtimeOpenReason) => void;

export type RealtimeConnectionState =
  | 'connecting'
  | 'open'
  | 'reconnecting'
  | 'unhealthy';

export type RealtimeStateListener = (state: RealtimeConnectionState) => void;

const DEFAULT_WEBSOCKET_URL = '/ws';

export class RealtimeClient {
  private static readonly RECONNECT_BASE_MS = 1000;
  private static readonly RECONNECT_MAX_MS = 30000;
  private static readonly UNHEALTHY_AFTER_ATTEMPTS = 3;
  private static readonly WS_CONNECTING = 0;
  private static readonly WS_OPEN = 1;

  // One channel per tab: core publishes a query's events to the channel_id sent with it.
  public readonly channelId: string = crypto.randomUUID();

  private socket?: WebSocket;
  private reconnectTimeoutId?: ReturnType<typeof setTimeout>;
  private url?: string;
  private started = false;
  private generation = 0;
  private reconnectAttempts = 0;

  private readonly handlersByQuery: Map<string, Set<RealtimeHandler>> =
    new Map();
  private readonly openListeners: Set<RealtimeOpenListener> = new Set();
  private readonly stateListeners: Set<RealtimeStateListener> = new Set();

  public subscribeState(listener: RealtimeStateListener): () => void {
    this.stateListeners.add(listener);
    return () => {
      this.stateListeners.delete(listener);
    };
  }

  public subscribeOpen(listener: RealtimeOpenListener): () => void {
    this.openListeners.add(listener);
    return () => {
      this.openListeners.delete(listener);
    };
  }

  private emitState(state: RealtimeConnectionState): void {
    this.stateListeners.forEach(listener => {
      try {
        listener(state);
      } catch (err) {
        logging.warn('Realtime state-listener error', err);
      }
    });
  }

  private reconnectDelayMs(attempts: number): number {
    const base = Math.min(
      RealtimeClient.RECONNECT_BASE_MS * 2 ** Math.max(0, attempts - 1),
      RealtimeClient.RECONNECT_MAX_MS,
    );
    return (
      base + Math.random() * Math.min(base, RealtimeClient.RECONNECT_BASE_MS)
    );
  }

  private scheduleReconnect(thisGeneration: number): void {
    this.reconnectAttempts += 1;
    this.emitState(
      this.reconnectAttempts >= RealtimeClient.UNHEALTHY_AFTER_ATTEMPTS
        ? 'unhealthy'
        : 'reconnecting',
    );
    this.reconnectTimeoutId = setTimeout(
      () => this.openSocket(thisGeneration, 'reconnect'),
      this.reconnectDelayMs(this.reconnectAttempts),
    );
  }

  public dispatchMessage(rawData: string): void {
    let event: QueryEvent;
    try {
      const parsed: unknown = JSON.parse(rawData);
      // Control replies such as {"action":"pong"} carry no query_id.
      if (!parsed || typeof parsed !== 'object') return;
      if (typeof (parsed as { query_id?: unknown }).query_id !== 'string') {
        return;
      }
      event = parsed as QueryEvent;
    } catch (err) {
      logging.warn('Failed to parse realtime message', err);
      return;
    }
    this.handlersByQuery.get(event.query_id)?.forEach(handler => {
      try {
        handler(event);
      } catch (err) {
        logging.warn('Realtime handler error', err);
      }
    });
  }

  private buildConnectUrl(baseUrl: string): string {
    const base =
      typeof window !== 'undefined' ? window.location.href : 'http://localhost';
    const parsed = new URL(baseUrl, base);
    if (parsed.protocol === 'http:') parsed.protocol = 'ws:';
    else if (parsed.protocol === 'https:') parsed.protocol = 'wss:';
    parsed.searchParams.set('channel_id', this.channelId);
    return parsed.toString();
  }

  private hasActiveSocket(): boolean {
    return (
      this.socket?.readyState === RealtimeClient.WS_CONNECTING ||
      this.socket?.readyState === RealtimeClient.WS_OPEN
    );
  }

  private teardownSocket(): void {
    if (this.reconnectTimeoutId) clearTimeout(this.reconnectTimeoutId);
    if (this.socket) {
      this.socket.onopen = null;
      this.socket.onmessage = null;
      this.socket.onclose = null;
      this.socket.onerror = null;
      try {
        this.socket.close();
      } catch {
        // ignore
      }
      this.socket = undefined;
    }
  }

  private openSocket(thisGeneration: number, reason: RealtimeOpenReason): void {
    if (thisGeneration !== this.generation) return;
    if (!this.url || typeof WebSocket === 'undefined') return;
    this.emitState('connecting');
    let ws: WebSocket;
    try {
      ws = new WebSocket(this.buildConnectUrl(this.url));
    } catch (err) {
      logging.warn('Failed to open realtime WebSocket', err);
      this.scheduleReconnect(thisGeneration);
      return;
    }
    this.socket = ws;

    ws.onopen = () => {
      if (thisGeneration !== this.generation) return;
      this.reconnectAttempts = 0;
      this.emitState('open');
      this.openListeners.forEach(listener => {
        try {
          listener(reason);
        } catch (err) {
          logging.warn('Realtime open-listener error', err);
        }
      });
    };

    ws.onmessage = (event: MessageEvent) => {
      if (thisGeneration === this.generation) {
        this.dispatchMessage(String(event.data));
      }
    };

    ws.onclose = () => {
      if (thisGeneration !== this.generation) return;
      this.scheduleReconnect(thisGeneration);
    };

    ws.onerror = () => {};
  }

  public connect(config?: RealtimeConfig): void {
    const nextUrl = config?.WEBSOCKET_URL ?? DEFAULT_WEBSOCKET_URL;
    if (this.started && this.url === nextUrl && this.hasActiveSocket()) return;

    this.teardownSocket();
    this.generation += 1;
    this.reconnectAttempts = 0;
    this.started = true;
    this.url = nextUrl;
    this.openSocket(this.generation, 'initial');
  }

  public disconnect(): void {
    this.generation += 1;
    this.reconnectAttempts = 0;
    this.teardownSocket();
  }

  public subscribe(queryId: string, handler: RealtimeHandler): () => void {
    let queryHandlers = this.handlersByQuery.get(queryId);
    if (!queryHandlers) {
      queryHandlers = new Set();
      this.handlersByQuery.set(queryId, queryHandlers);
    }
    queryHandlers.add(handler);
    if (!this.started) this.connect();

    return () => {
      const current = this.handlersByQuery.get(queryId);
      if (!current) return;
      current.delete(handler);
      if (current.size === 0) this.handlersByQuery.delete(queryId);
    };
  }
}

export const defaultRealtimeClient = new RealtimeClient();

export const getRealtimeChannelId = () => defaultRealtimeClient.channelId;

export const subscribeRealtimeState = (listener: RealtimeStateListener) =>
  defaultRealtimeClient.subscribeState(listener);

export const subscribeRealtimeOpen = (listener: RealtimeOpenListener) =>
  defaultRealtimeClient.subscribeOpen(listener);

export const connectRealtime = (config?: RealtimeConfig) =>
  defaultRealtimeClient.connect(config);

export const disconnectRealtime = () => defaultRealtimeClient.disconnect();

export const subscribeRealtime = (queryId: string, handler: RealtimeHandler) =>
  defaultRealtimeClient.subscribe(queryId, handler);
