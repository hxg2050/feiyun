import { IServer } from './IServer';

const createId = (() => {
  let id = 0
  return () => {
    return ++ id;
  }
})();

export class Socket {
  id = createId();

  constructor(public server: IServer) {

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
  send(name: string, data?: any) {
    this.server.sendTo(this.id, name, data);
  }

  /**
   * 断开链接
   */
  close() {

  }
}
