import EventEmitter from 'eventemitter3'
import Queue from 'queue'

// import WebSocket from './node';

export interface ClientConfig {
  url: string
  /**
   * 心跳间隔时间
   */
  heart?: number

  autoConnect?: boolean
  autoReconnect?: boolean
  reconnectTime?: number
}

type EventCallback = (...args: any[]) => void

export class FeiyunClient {
  private index: number = 0

  private ws!: WebSocket;

  public emitter: EventEmitter = new EventEmitter()
  private anyKey = Symbol('anyKey')

  private queue = new Queue({ results: [] });
  public online: boolean = false;

  public config: Required<ClientConfig> = {
    url: '',
    heart: 30 * 1000,
    autoConnect: true,
    autoReconnect: true,
    reconnectTime: 5 * 1000
  };

  private canClose = false;

  constructor(config: ClientConfig) {
    this.config = Object.assign({}, this.config, config);
    if (this.config.autoConnect) {
      this.connect();
    }
  }

  /**
   * 连接成功
   */
  private onOpen() {
    console.log('连接服务器成功');
    clearTimeout(this.reconnectTimer);
    this.config.heart && this.ping();
    this.online = true;
    this.emitter.emit('connect');
    this.queue.start();
  }

  pingTimeout?: any

  private ping() {
    this.ws.send('ping')
    this.pingTimeout = setTimeout(() => {
      this.ping()
    }, this.config.heart)
  }

  /**
   * 接受到消息
   */
  private onMessage(data: string) {
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

  private onError() {
    this.emitter.emit('error');
    this.autoReconnect();
  }

  private onClose() {
    console.log('连接断开')
    this.online = false;
    clearTimeout(this.pingTimeout)
    this.emitter.emit('disconnect')
    this.autoReconnect();
  }

  private lastConnectTime = 0;
  private reconnectTimer?: any;
  /**
   * Auto connect server.
   * @returns 
   */
  private autoReconnect() {
    if (this.reconnectTimer) {
      return;
    }

    // Get the waiting time for the timer.
    const waitTime = Math.min(this.config.reconnectTime, performance.now() - this.lastConnectTime);
    // Record the current time.
    this.lastConnectTime = performance.now();
    // Save last timer.
    this.reconnectTimer = setTimeout(this.reconnect.bind(this), waitTime);
  }

  /**
   * Send message to server.
   */
  send(name: string, data?: any) {
    const index = ++this.index;
    if (this.online) {
      this.ws.send(JSON.stringify([index, name, data]));
    } else {
      this.queue.push(() => {
        this.ws.send(JSON.stringify([index, name, data]));
      });
    }
  }

  /**
   * 监听服务器发来的消息
   * @param name
   * @param callback
   */
  on(name: string | symbol, callback: EventCallback, target?: any): void
  on(callback: EventCallback, target?: any): void
  on(name: string | symbol | EventCallback, callback?: EventCallback | any, target?: any) {
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
    this.send(name, data);
    const index = this.index;
    return new Promise((resolve, reject) => {
      this.requestCallback[index] = (msg: any) => {
        resolve(msg)
      }
    })
  }

  /**
   * Connect server
   */
  connect() {
    this.canClose = false;
    this.ws = new WebSocket(this.config.url)
    this.ws.addEventListener('open', () => {
      this.onOpen()
    })
    this.ws.addEventListener('error', (event) => {
      this.onError()
    })
    this.ws.addEventListener('message', (event) => {
      this.onMessage(event.data)
    })
    this.ws.addEventListener('close', () => {
      this.onClose()
    })
  }

  /**
   * 重连
   */
  reconnect() {
    this.ws = new WebSocket(this.config.url)
    this.ws.addEventListener('open', () => {
      console.log('重新连接服务器成功');
      this.online = true;
      this.emitter.emit('reconnect');
      this.queue.start();
      clearTimeout(this.reconnectTimer);
    })

    this.ws.addEventListener('error', (event) => {
      this.onError()
    })
    this.ws.addEventListener('message', (event) => {
      this.onMessage(event.data)
    })
    this.ws.addEventListener('close', () => {
      this.onClose()
    })
  }

  /**
   * Close connection
   */
  close() {
    this.canClose = true;
    this.ws.close()
  }
}
