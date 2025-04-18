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

  isReconnecting = false;

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
    this.online = true;
    console.log('onOpen')
    if (this.isReconnecting) {
      this.isReconnecting = false;
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
      this.emitter.emit('connect', {
        reconnect: true
      });
      this.emitter.emit('reconnect');
    } else {
      this.config.heart && this.ping();
      this.emitter.emit('connect', {
        reconnect: false
      });
    }
    this.queue.start();
  }

  pingTimeout?: any

  private ping() {
    if (this.online) {
      this.ws.send('ping')
    }
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
      this.requestCallback[route]?.(req)
      return
    }
    this.emitter.emit(this.anyKey, {
      name: route,
      data: req,
    })
    this.emitter.emit(route, req)
  }

  private onError(error) {
    this.emitter.emit('error', error);
    // this.autoReconnect();
  }

  private onClose(event: CloseEvent) {
    this.online = false;
    this.queue.stop();
    clearTimeout(this.pingTimeout)
    this.emitter.emit('disconnect', event)
    if (event.wasClean) {
      // 服务器主动关闭
      this.canClose = true;
    } else {
      this.autoReconnect();
    }
  }

  private lastConnectTime = 0;
  private reconnectTimer?: any;
  /**
   * Auto connect server.
   * @returns 
   */
  private autoReconnect() {
    if (this.online || this.isReconnecting) {
      return;
    }
    console.log('autoReconnect', this.online, this.isReconnecting);
    this.isReconnecting = true;
    this.reconnect();
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
  async request<T = unknown>(name: string, data: any = {}, options: { timeout?: number } = {}) {
    this.send(name, data);
    const index = this.index;
    const out = options.timeout || 30 * 1000;
    return new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(() => {
        delete this.requestCallback[index];
        reject({ msg: `timeout ${out}ms`, name, data });
      }, out);

      this.requestCallback[index] = (msg: any) => {
        clearTimeout(timeout);
        delete this.requestCallback[index];
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
      this.onError(event)
    })
    this.ws.addEventListener('message', (event) => {
      this.onMessage(event.data)
    })
    this.ws.addEventListener('close', (event: CloseEvent) => {
      this.onClose(event)
    })
  }

  /**
   * 重连
   */
  reconnect() {
    if (this.online) {
      return;
    }
    this.connect();

    // Get the waiting time for the timer.
    const waitTime = Math.min(this.config.reconnectTime, performance.now() - this.lastConnectTime);
    // Record the current time.
    this.lastConnectTime = performance.now();
    // Save last timer.
    this.reconnectTimer = setTimeout(this.reconnect.bind(this), waitTime);
  }

  /**
   * Close connection
   */
  close() {
    this.canClose = true;
    this.ws.close()
  }
}
