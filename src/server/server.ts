import { Socket } from './socket'
import { createWebsocketServer } from './ws'
import { IWebsocketServer } from './IWebSocketServer'
import { ServerWebSocket } from 'bun'
type Handler = (msg: any, client: Socket) => Promise<any> | any


interface ServerConfig {
  port: number
  timeout?: number
}
/**
 * 服务器
 */
export class Server {
  handlers = new Map<string, Handler>()

  clientIndex: number = 0

  wss?: IWebsocketServer

  clients: Map<number, Socket> = new Map()
  clientsFromServerWebSocket: Map<ServerWebSocket, Socket> = new Map();
  clientsFromUid: Map<string | number, Socket> = new Map()

  /**
   * 配置
   * @param config 配置
   */
  constructor(private config: ServerConfig) {
    // this.wss = new WebSocketServer(config);
    // this.wss.on('connection', (socket, request) => {
    //     this.onConnection(socket, request);
    // });
    // console.log('ws://127.0.0.1:' + config.port);
  }

  /**
   * 开始
   */
  start() {
    this.wss = createWebsocketServer({
      port: this.config.port
    });
    this.wss.open((ws) => {
      const client = new Socket(++this.clientIndex, this, ws)
      this.clients.set(this.clientIndex, client)
      this.clientsFromServerWebSocket.set(ws, client);
    });
    this.wss.message((ws, data) => {
      const str = data.toString()
      this.onMessage(this.clientsFromServerWebSocket.get(ws)!, str)
    });
    this.wss.close((ws) => {
      this.clientsFromServerWebSocket.delete(ws);
    });
    // console.log('ws://127.0.0.1:' + this.config.port);
  }


  async onMessage(client: Socket, data: string) {
    try {
      this.handlerCallback?.(client, data)
    } catch (error) {
      console.error(error)
    }
  }

  handlerCallback?: (client: Socket, data: string) => void

  private closeHandler?: (client: Socket) => void
  onClose(callback: (client: Socket) => void) {
    this.closeHandler = callback
  }

  on(path: string, handler: Handler) {
    this.handlers.set(path, handler)
  }

  /**
   * 发送消息到客户端
   * @param sokcet
   * @param name
   * @param data
   */
  send(sokcet: ServerWebSocket, name: string | number, data: any) {
    sokcet.send(JSON.stringify([1, name, data]))
  }

  /**
   * 发送消息到客户端(uid)
   */
  sendToUid(uid: string | number, name: string, data: any) {
    const socket = this.clientsFromUid.get(uid)

    if (!socket) {
      return false
    }

    socket.send(name, data)

    return true
  }

  /**
   * 给客户端回复消息
   * @param socket
   * @param id
   * @param data
   */
  reply(socket: ServerWebSocket, id: number, data: any) {
    this.send(socket, id, data)
  }

  isDebug = false

  doc?: string

  debug(isDebug: boolean, config: {
    doc?: string
  }) {
    this.isDebug = isDebug
    this.doc = config.doc
  }
}
