import EventEmitter from 'eventemitter3';

export type ClientConfig = {
    url: string
    /**
     * 心跳间隔时间
     */
    heart: number
}

export class GameSocketClient {
    private index: number = 0;

    private ws: WebSocket;

    private emitter: EventEmitter = new EventEmitter();

    constructor(private config: ClientConfig) {
        this.ws = new WebSocket(this.config.url);
        this.ws.addEventListener('open', () => {
            this.onOpen();
        });
        this.ws.addEventListener('message', (event) => {
            this.onMessage(event.data);
        });
        this.ws.addEventListener('close', () => {
            this.onClose();
        });
    }

    /**
     * 连接成功
     */
    onOpen() {
        console.log('连接服务器成功');
        this.config.heart && this.ping();
    }

    pingTimeout?: number | NodeJS.Timeout;

    ping() {
        this.ws.send('ping');
        this.pingTimeout = setTimeout(() => {
            this.ping();
        }, this.config.heart);
    }

    /**
     * 接受到消息
     */
    onMessage(data: string) {
        const msg = JSON.parse(data);
        const [id, route, req]: [number, number | string, any] = msg;
        if (typeof route === 'number') {
            // 表示为request请求
            this.requestCallback[route](req);
            return;
        }
        this.emitter.emit(route, req);
    }

    onClose() {
        console.log('连接断开');
        clearTimeout(this.pingTimeout);
    }

    /**
     * 发送消息
     */
    send(name: string, data?: any) {
        this.ws.send(JSON.stringify([++this.index, name, data]));
    }

    /**
     * 监听服务器发来的消息
     * @param name 
     * @param callback 
     */
    on(name: string, callback: (...args: any[]) => void) {
        this.emitter.on(name, callback, this);
    }

    /**
     * 监听所有服务器通知消息
     */
    any(callback: (name: string, data?: any) => void) {
    }

    private requestCallback: Record<number, any> = {};

    /**
     * 请求
     * @param name 
     * @param data 
     * @returns 
     */
    async request(name: string, data?: any) {
        this.send(name, data);
        return new Promise((resolve, reject) => {
            this.requestCallback[this.index] = (msg: any) => {
                resolve(msg);
            };
        });
    }

    /**
     * 断开连接
     */
    close() {
        this.ws.close();
    }
}

