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

import { Client } from "@bi-metrics/core";
import { logging } from "@bi-metrics/core/utils";
// import getBootstrapData from "src/utils/getBootstrapData";
// import { getTabId, subscribeTabIdChange } from "src/hooks/useTabId";

export interface RealtimeMessage {
  topic: string;
  payload: unknown;
}

export type RealtimeHandler = (payload: unknown) => void;

export type RealtimeConfig = {
  WEBSOCKET_ENABLE?: boolean;
  WEBSOCKET_URL?: string;
  WEBSOCKET_JWT_EXPIRATION_SECONDS?: number;
};

export type RealtimeOpenReason = "initial" | "reconnect" | "keepalive";
export type RealtimeOpenListener = (reason: RealtimeOpenReason) => void;

export type RealtimeConnectionState =
  | "connecting"
  | "open"
  | "reconnecting"
  | "unhealthy";

export type RealtimeStateListener = (state: RealtimeConnectionState) => void;

export class RealtimeClient {
  private static readonly RECONNECT_BASE_MS = 1000;
  private static readonly RECONNECT_MAX_MS = 30000;
  private static readonly UNHEALTHY_AFTER_ATTEMPTS = 3;
  private static readonly WS_CONNECTING = 0;
  private static readonly WS_OPEN = 1;
  private static readonly KEEPALIVE_FRACTION = 0.6;
  private static readonly COOKIE_REFRESH_ENDPOINT = "/api/v1/me/";

  private socket?: WebSocket;
  private reconnectTimeoutId?: number;
  private keepaliveTimeoutId?: number;
  private tokenLifetimeMs = 0;
  private enabled = false;
  private url?: string;
  private started = false;
  private generation = 0;
  private reconnectAttempts = 0;

  private readonly handlersByTopic = new Map<string, Set<RealtimeHandler>>();
  private readonly openListeners = new Set<RealtimeOpenListener>();
  private readonly stateListeners = new Set<RealtimeStateListener>();

  constructor() {
    subscribeTabIdChange(() => {
      if (!this.enabled || !this.hasActiveSocket()) return;
      this.generation += 1;
      this.teardownSocket();
      this.openSocket(this.generation, "reconnect");
    });
  }

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
    this.stateListeners.forEach((listener) => {
      try {
        listener(state);
      } catch (err) {
        logging.warn("Realtime state-listener error", err);
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
        ? "unhealthy"
        : "reconnecting",
    );
    this.reconnectTimeoutId = window.setTimeout(
      () => this.openSocket(thisGeneration, "reconnect"),
      this.reconnectDelayMs(this.reconnectAttempts),
    );
  }

  public dispatchMessage(rawData: string): void {
    let message: RealtimeMessage;
    try {
      const parsed: unknown = JSON.parse(rawData) ?? {};
      if (!parsed || typeof parsed !== "object") return;
      const { topic, payload } = parsed as {
        topic?: unknown;
        payload?: unknown;
      };
      if (typeof topic !== "string") return;
      message = { topic, payload };
    } catch (err) {
      logging.warn("Failed to parse realtime message", err);
      return;
    }
    const topicHandlers = this.handlersByTopic.get(message.topic);
    if (!topicHandlers) return;
    topicHandlers.forEach((handler) => {
      try {
        handler(message.payload);
      } catch (err) {
        logging.warn("Realtime handler error", err);
      }
    });
  }

  private buildConnectUrl(baseUrl: string): string {
    try {
      const base =
        typeof window !== "undefined" ? window.location.href : undefined;
      const parsed = new URL(baseUrl, base);
      if (parsed.protocol === "http:") parsed.protocol = "ws:";
      else if (parsed.protocol === "https:") parsed.protocol = "wss:";
      parsed.searchParams.set("tab_id", getTabId());
      return parsed.toString();
    } catch {
      const sep = baseUrl.includes("?") ? "&" : "?";
      return `${baseUrl}${sep}tab_id=${encodeURIComponent(getTabId())}`;
    }
  }

  private hasActiveSocket(): boolean {
    return (
      this.socket?.readyState === RealtimeClient.WS_CONNECTING ||
      this.socket?.readyState === RealtimeClient.WS_OPEN
    );
  }

  private teardownSocket(): void {
    if (this.reconnectTimeoutId) clearTimeout(this.reconnectTimeoutId);
    if (this.keepaliveTimeoutId) clearTimeout(this.keepaliveTimeoutId);
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
    if (!this.enabled || !this.url || typeof WebSocket === "undefined") return;
    const connectUrl = this.buildConnectUrl(this.url);
    this.emitState("connecting");
    let ws: WebSocket;
    try {
      ws = new WebSocket(connectUrl);
    } catch (err) {
      logging.warn("Failed to open realtime WebSocket", err);
      this.scheduleReconnect(thisGeneration);
      return;
    }
    this.socket = ws;

    if (this.enabled && this.tokenLifetimeMs > 0) {
      this.keepaliveTimeoutId = window.setTimeout(() => {
        if (
          thisGeneration !== this.generation ||
          this.socket !== ws ||
          ws.readyState !== RealtimeClient.WS_OPEN
        ) {
          return;
        }
        Client.get({ endpoint: RealtimeClient.COOKIE_REFRESH_ENDPOINT })
          .catch(() => {})
          .finally(() => {
            if (
              thisGeneration !== this.generation ||
              this.socket !== ws ||
              ws.readyState !== RealtimeClient.WS_OPEN
            ) {
              return;
            }
            this.generation += 1;
            this.teardownSocket();
            this.openSocket(this.generation, "keepalive");
          });
      }, this.tokenLifetimeMs * RealtimeClient.KEEPALIVE_FRACTION);
    }

    ws.onopen = () => {
      if (thisGeneration !== this.generation) return;
      this.reconnectAttempts = 0;
      this.emitState("open");
      this.openListeners.forEach((listener) => {
        try {
          listener(reason);
        } catch (err) {
          logging.warn("Realtime open-listener error", err);
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
    const conf = config ?? getBootstrapData().common.conf;
    const nextEnabled = Boolean(conf?.WEBSOCKET_ENABLE);
    const nextUrl = conf?.WEBSOCKET_URL;

    if (
      this.started &&
      this.enabled === nextEnabled &&
      this.url === nextUrl &&
      (!nextEnabled || this.hasActiveSocket())
    ) {
      return;
    }

    this.teardownSocket();
    this.generation += 1;
    this.reconnectAttempts = 0;
    this.started = true;
    this.enabled = nextEnabled;
    this.url = nextUrl;
    this.tokenLifetimeMs = (conf?.WEBSOCKET_JWT_EXPIRATION_SECONDS ?? 0) * 1000;
    this.openSocket(this.generation, "initial");
  }

  public disconnect(): void {
    this.generation += 1;
    this.reconnectAttempts = 0;
    this.teardownSocket();
  }

  public subscribe(topic: string, handler: RealtimeHandler): () => void {
    let topicHandlers = this.handlersByTopic.get(topic);
    if (!topicHandlers) {
      topicHandlers = new Set();
      this.handlersByTopic.set(topic, topicHandlers);
    }
    topicHandlers.add(handler);
    if (!this.started) this.connect();

    return () => {
      const current = this.handlersByTopic.get(topic);
      if (!current) return;
      current.delete(handler);
      if (current.size === 0) this.handlersByTopic.delete(topic);
    };
  }

  public resetForTests(): void {
    this.disconnect();
    this.handlersByTopic.clear();
    this.openListeners.clear();
    this.stateListeners.clear();
    this.reconnectAttempts = 0;
    this.started = false;
    this.enabled = false;
    this.url = undefined;
  }

  public emitOpenForTests(reason: RealtimeOpenReason = "reconnect"): void {
    this.openListeners.forEach((listener) => listener(reason));
  }
}

export const defaultRealtimeClient = new RealtimeClient();

export const subscribeRealtimeState = (listener: RealtimeStateListener) =>
  defaultRealtimeClient.subscribeState(listener);

export const subscribeRealtimeOpen = (listener: RealtimeOpenListener) =>
  defaultRealtimeClient.subscribeOpen(listener);

export const dispatchRealtimeMessage = (rawData: string) =>
  defaultRealtimeClient.dispatchMessage(rawData);

export const connectRealtime = (config?: RealtimeConfig) =>
  defaultRealtimeClient.connect(config);

export const disconnectRealtime = () => defaultRealtimeClient.disconnect();

export const subscribeRealtime = (topic: string, handler: RealtimeHandler) =>
  defaultRealtimeClient.subscribe(topic, handler);

export const resetRealtimeForTests = () =>
  defaultRealtimeClient.resetForTests();

export const emitRealtimeOpenForTests = (
  reason: RealtimeOpenReason = "reconnect",
) => defaultRealtimeClient.emitOpenForTests(reason);
