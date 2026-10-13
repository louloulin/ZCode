import {
  ChannelClient,
  MessagePortProtocol,
  ProxyChannel,
  type MessagePortLike,
  type MessagePortPayload,
} from "@lumos/rpc";
import {
  ILumosTaskService,
  type ILumosTaskService as ILumosTaskServiceShape,
} from "#src/session/lumosTaskService.js";
import {
  ILumosAgentService,
  type ILumosAgentService as ILumosAgentServiceShape,
} from "#src/lumos-agent/lumosAgent.js";
import {
  ILumosSessionService,
  type ILumosSessionService as ILumosSessionServiceShape,
} from "#src/lumos-session/lumosSession.js";
import {
  IModelSelectionService,
  type IModelSelectionService as IModelSelectionServiceShape,
} from "#src/model-provider/providerFacadeServices.js";

interface PortLike {
  on?(event: "message", listener: (event: { data: MessagePortPayload }) => void): void;
  off?(event: "message", listener: (event: { data: MessagePortPayload }) => void): void;
  addEventListener?(
    event: "message",
    listener: (event: { data: MessagePortPayload }) => void,
  ): void;
  removeEventListener?(
    event: "message",
    listener: (event: { data: MessagePortPayload }) => void,
  ): void;
  postMessage(message: MessagePortPayload): void;
  start?(): void;
  close?(): void;
}

function toMessagePortLike(port: PortLike): MessagePortLike {
  return {
    addEventListener(type, listener) {
      if (port.addEventListener) {
        port.addEventListener(type, listener);
        return;
      }
      port.on?.(type, listener);
    },
    removeEventListener(type, listener) {
      if (port.removeEventListener) {
        port.removeEventListener(type, listener);
        return;
      }
      port.off?.(type, listener);
    },
    postMessage(data) {
      port.postMessage(data);
    },
    start() {
      port.start?.();
    },
    close() {
      port.close?.();
    },
  };
}

export interface RemoteBotWorkspaceRuntimeServices {
  lumosAgentService: ILumosAgentServiceShape;
  lumosTaskService: ILumosTaskServiceShape;
  lumosSessionService: ILumosSessionServiceShape;
  modelSelectionService: IModelSelectionServiceShape;
}

export function createRemoteRuntimeServicesFromPort(
  port: unknown,
): RemoteBotWorkspaceRuntimeServices {
  const protocol = new MessagePortProtocol(toMessagePortLike(port as PortLike));
  const client = new ChannelClient(protocol);
  return {
    lumosAgentService: ProxyChannel.toService<ILumosAgentServiceShape>(
      client.getChannel(ILumosAgentService.channelName),
    ),
    lumosTaskService: ProxyChannel.toService<ILumosTaskServiceShape>(
      client.getChannel(ILumosTaskService.channelName),
    ),
    lumosSessionService: ProxyChannel.toService<ILumosSessionServiceShape>(
      client.getChannel(ILumosSessionService.channelName),
    ),
    modelSelectionService: ProxyChannel.toService<IModelSelectionServiceShape>(
      client.getChannel(IModelSelectionService.channelName),
    ),
  };
}
