import type { Event, IDisposable } from "@lumos/rpc";
import type { LumosProtocolMessage } from "@lumos/shared";

export type LumosProtocolTransportKind = "stdio" | "websocket" | "memory";

export interface LumosProtocolTransportClosedEvent {
  code?: number | null;
  signal?: NodeJS.Signals | null;
  reason?: string;
}

export interface LumosProtocolTransport extends IDisposable {
  readonly kind: LumosProtocolTransportKind;
  readonly onMessage: Event<LumosProtocolMessage>;
  readonly onClose: Event<LumosProtocolTransportClosedEvent>;
  send(message: LumosProtocolMessage): Promise<void>;
  disposeAndWait?(): Promise<void>;
}
