export interface HelloMessage {
  type: "lumos-hello";
  version: string;
  platform: string;
  arch: string;
  pid: number;
}

export interface HelloAckMessage {
  type: "lumos-hello-ack";
  version: string;
  clientId: string;
}
