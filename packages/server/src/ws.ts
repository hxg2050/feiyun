import { ServerWebSocket } from "bun";
import { IWebsocketServer } from "./IWebsocketServer";

export type WebSocketData = Record<string, any>

export type SWS = ServerWebSocket<WebSocketData>;

const ALL = '_:world';
export const createWebsocketServer = (options: { port?: number, timeout?: number } = {}): IWebsocketServer<WebSocketData> => {

  const allTimeout: Map<SWS, Timer> = new Map();
  const ping = (ws: SWS) => {
    if (!options.timeout || options.timeout < 0) {
      return
    }
    clearTimeout(allTimeout.get(ws));
    allTimeout.set(ws, setTimeout(ws.close, options.timeout));
  }

  const stopPing = (ws: SWS) => {
    clearTimeout(allTimeout.get(ws));
    allTimeout.delete(ws);
  }

  let openHandler: (ws: SWS) => void;
  let messageHandler: (ws: SWS, message: string | Buffer) => void;
  let closeHandler: (ws: SWS) => void;

  const open = (handler: typeof openHandler) => {
    openHandler = handler;
  }
  const message = (handler: typeof messageHandler) => {
    messageHandler = handler;
  }

  const close = (handler: typeof closeHandler) => {
    closeHandler = handler;
  }

  Bun.serve<WebSocketData>({
    port: options.port,
    fetch(req, server) {
      const params = new URL(req.url).searchParams;

      const data: WebSocketData = {};
      for (const [key, value] of params) {
        data[key as string] = value;
      }

      if (server.upgrade(req, { data })) {
        
        return;
      }

      return new Response("Error");
    },
    websocket: {
      open(ws) {
        ws.subscribe(ALL);
        options.timeout && ping(ws);
        openHandler && openHandler(ws);
      },
      message(ws, message) {
        if (message === 'ping') {
          if (options.timeout) {
            ping(ws);
          }
        } else {
          messageHandler && messageHandler(ws, message);
        }
      },
      close(ws) {
        ws.unsubscribe(ALL);
        options.timeout && stopPing(ws);
        closeHandler && closeHandler(ws);
      },
      perMessageDeflate: false,
      publishToSelf: true,
    },
  });

  return {
    open,
    message,
    close
  }
}