import { ServerWebSocket } from "bun";

export interface IWebsocketServer<T = undefined> {
  open(handler: (ws: ServerWebSocket<T>) => void): void;
  message(handler: (ws: ServerWebSocket<T>, message: string | Buffer) => void): void;
  close(handler: (ws: ServerWebSocket<T>) => void): void;
}