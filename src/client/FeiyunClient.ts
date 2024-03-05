import EventEmitter from 'eventemitter3'
import Queue from 'queue'

import WebSocket from './node';

export interface ClientConfig {
  url: string
  /**
   * 心跳间隔时间
   */
  heart: number
}

type EventCallback = (...args: any[]) => void

export class FeiyunClient {
  private index: number = 0

  private ws: WebSocket

  private emitter: EventEmitter = new EventEmitter()
  private anyKey = Symbol('anyKey')

  private queue = new Queue({ results: [] });
  public online: boolean = false;

  constructor(private config: ClientConfig) {
    this.ws = new WebSocket(this.config.url)
    this.ws.addEventListener('open', () => {
      this.onOpen()
    })
    this.ws.addEventListener('message', (event) => {
      this.onMessage(event.data)
    })
    this.ws.addEventListener('close', () => {
      this.onClose()
    })
  }

  // private _connection?: () => void;
  // onConnection(callback: () => void) {
  //     this._connection = callback;
  // }

  /**
   * 连接成功
   */
  onOpen() {
    console.log('连接服务器成功');
    this.config.heart && this.ping();
    this.online = true;
    this.emitter.emit('connect');
    this.queue.start();
  }

  pingTimeout?: number | NodeJS.Timeout

  ping() {
    this.ws.send('ping')
    this.pingTimeout = setTimeout(() => {
      this.ping()
    }, this.config.heart)
  }

  /**
   * 接受到消息
   */
  onMessage(data: string) {
    const msg = JSON.parse(data)
    const [id, route, req]: [number, number | string, any] = msg
    if (typeof route === 'number') {
      // 表示为request请求
      this.requestCallback[route](req)
      return
    }
    this.emitter.emit(this.anyKey, {
      name: route,
      data: req,
    })
    this.emitter.emit(route, req)
  }

  onClose() {
    console.log('连接断开')
    this.online = false;
    clearTimeout(this.pingTimeout)
    this.emitter.emit('disconnect')
  }

  /**
   * 发送消息
   */
  send(name: string, data?: any) {
    ++this.index;
    if (this.online) {
      this.ws.send(JSON.stringify([this.index, name, data]));
    } else {
      this.queue.push(() => {
        this.ws.send(JSON.stringify([this.index, name, data]));
      });
    }
  }

  /**
   * 监听服务器发来的消息
   * @param name
   * @param callback
   */
  on(name: string | symbol | EventCallback, callback: EventCallback | any, target: any) {
    if (typeof name === 'function') {
      // 监听所有服务器通知消息
      this.on(this.anyKey, name, callback)
    } else {
      this.emitter.on(name, callback, target)
    }
  }

  /**
   * 监听所有服务器通知消息
   */
  off(name: string | symbol | EventCallback, callback: EventCallback | any, target: any) {
    if (typeof name === 'function') {
      // 监听所有服务器通知消息
      this.off(this.anyKey, name, callback)
    } else {
      this.emitter.off(name, callback, target)
    }
  }

  private requestCallback: Record<number, any> = {}

  /**
   * 请求
   * @param name
   * @param data
   * @returns
   */
  async request(name: string, data?: any) {
    this.send(name, data)
    return new Promise((resolve, reject) => {
      this.requestCallback[this.index] = (msg: any) => {
        resolve(msg)
      }
    })
  }

  /**
   * 断开连接
   */
  close() {
    this.ws.close()
  }
}
