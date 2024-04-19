import { ServerWebSocket } from 'bun'
import type { Server } from './server'

export class Socket {
  constructor(public id: number, public server: Server, public socket: ServerWebSocket) {

  }

  data: Record<string, any> = {}

  /**
   * 绑定数据
   */
  bind(name: string, value: any) {
    this.data[name] = value
  }

  private _uid?: number
  get uid() {
    return this._uid
  }
  set uid(val) {
    this._uid = val
    if (this._uid !== undefined) {
      this.server.bindUid(this._uid, this);
    }
  }

  /**
   * 发送消息
   */
  send(name: number, data?: any): void
  send(name: string, data?: any): void
  send(name: string | number, data?: any) {
    this.socket.send(JSON.stringify([1, name, data]))
  }
}
