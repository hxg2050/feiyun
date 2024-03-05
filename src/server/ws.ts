import { ServerWebSocket } from "bun";
import { IWebsocketServer } from "./IWebsocketServer";

const ALL = '_:world';
export const createWebsocketServer = (options: { port?: number, timeout?: number } = {}): IWebsocketServer => {

  const allTimeout: Map<ServerWebSocket, Timer> = new Map();
  const ping = (ws: ServerWebSocket) => {
    if (!options.timeout || options.timeout < 0) {
      return
    }
    clearTimeout(allTimeout.get(ws));
    allTimeout.set(ws, setTimeout(ws.close, options.timeout));
  }

  const stopPing = (ws: ServerWebSocket) => {
    clearTimeout(allTimeout.get(ws));
    allTimeout.delete(ws);
  }

  let openHandler: (ws: ServerWebSocket) => void;
  let messageHandler: (ws: ServerWebSocket, message: string | Buffer) => void;
  let closeHandler: (ws: ServerWebSocket) => void;

  const open = (handler: typeof openHandler) => {
    openHandler = handler;
  }
  const message = (handler: typeof messageHandler) => {
    messageHandler = handler;
  }

  const close = (handler: typeof closeHandler) => {
    closeHandler = handler;
  }

  Bun.serve<undefined>({
    port: 3000,
    fetch(req, server) {
      if (
        server.upgrade(req, {
          data: {
          },
        })
      )
        return;

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