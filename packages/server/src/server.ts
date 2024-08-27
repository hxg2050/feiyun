import { Socket } from './socket'
import { SWS, WebSocketData, createWebsocketServer } from './ws'
import { IWebsocketServer } from './IWebsocketServer'
import { IServer } from './IServer'
type Handler = (msg: any, client: Socket) => Promise<any> | any


interface ServerConfig {
  port: number
  timeout?: number
}
/**
 * 服务器
 */
export class Server implements IServer {
  handlers = new Map<string, Handler>()

  wss?: IWebsocketServer<WebSocketData>

  clientsFromServerWebSocket: Map<SWS, Socket> = new Map();

  clients: Map<number, SWS> = new Map()
  clientsFromUid: Map<number, number> = new Map()

  /**
   * 配置
   * @param config 配置
   */
  constructor(private config: ServerConfig) {
  }

  /**
   * 开始
   */
  start() {
    this.wss = createWebsocketServer({
      port: this.config.port
    });
    this.wss.open((ws) => {
      const client = new Socket(this)
      this.clients.set(client.id, ws)
      this.clientsFromServerWebSocket.set(ws, client);
    });
    this.wss.message((ws, data) => {
      const str = data.toString()
      this.onMessage(this.clientsFromServerWebSocket.get(ws)!, str)
    });
    this.wss.close((ws) => {
      this.closeHandlerCallback?.(this.clientsFromServerWebSocket.get(ws)!)
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

  closeHandlerCallback?: (client: Socket) => void

  on(path: string, handler: Handler) {
    this.handlers.set(path, handler)
  }

  unbindUid(uid: number): void {
      this.clientsFromUid.delete(uid)
  }

  /**
   * 发送消息到客户端
   * @param sokcet
   * @param name
   * @param data
   */
  send(sokcet: SWS, name: string | number, data: any) {
    sokcet.send(JSON.stringify([1, name, data]))
  }


  sendTo(id: number, name: string, data: any): void {
    const sws = this.clients.get(id);
    if (!sws) {
      return;
    }
    this.send(sws, name, data)
  }

  /**
   * 发送消息到客户端(uid)
   */
  sendToUid(uid: number, name: string, data: any) {
    const socketId = this.clientsFromUid.get(uid)

    if (!socketId) {
      return;
    }
    this.sendTo(socketId, name, data)
  }

  /**
   * 绑定uid到连接上
   * @param uid 
   * @param socket 
   */
  bindUid(uid: number, socket: Socket) {
    this.clientsFromUid.set(uid, socket.id);
  }

  /**
   * 获取用户连接
   * @param uid 
   * @returns 
   */
  getByUid(uid: number) {
    return this.clientsFromUid.get(uid);
  }

  /**
   * 获取在线状态
   */
  isOnline(uid: number) {
    const socket = this.clients.get(uid);
    return socket?.readyState === 1
  }

  /**
   * 给客户端回复消息
   */
  reply(socketId: number, requestId: number, data: any) {
    const sws = this.clients.get(socketId);
    if (!sws) {
      return;
    }
    this.send(sws, requestId, data)
  }

  isDebug = false
}
