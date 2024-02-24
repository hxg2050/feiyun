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

  private _uid?: number | string
  get uid() {
    return this._uid
  }

  set uid(val) {
    this._uid = val
    if (this._uid !== undefined) {
      this.server.clientsFromUid.set(this._uid, this)
    }
  }

  /**
   * 发送消息
   */
  send(name: string, data?: any) {
    this.server.send(this.socket, name, data)
  }
}
