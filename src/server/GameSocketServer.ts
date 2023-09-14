import WebSocket, { WebSocketServer } from "ws";
import { IncomingMessage } from 'http';
import { GameSocket } from "./GameSocket";

type Handler = (msg: any, client: GameSocket) => Promise<any> | any;

type ServerConfig = {
    port: number;
    timeout?: number;
}
/**
 * 服务器
 */
export class GameSocketServer {

    handlers = new Map<string, Handler>();

    clientIndex: number = 0;

    wss: WebSocketServer;

    /**
     * 配置
     * @param config 配置
     */
    constructor(private config: ServerConfig) {
        this.wss = new WebSocketServer(config);
        this.wss.on('connection', (socket, request) => {
            this.onConnection(socket, request);
        });
        console.log('ws://127.0.0.1:' + config.port);
    }

    /**
     * 当有新用户连接上来时
     * 处理心跳
     * @param socket 
     * @param request 
     */
    onConnection(socket: WebSocket, request: IncomingMessage) {
        const client = new GameSocket(++this.clientIndex, this, socket);
        let timeout: NodeJS.Timeout;
        const ping = () => {
            if (!this.config.timeout || this.config.timeout < 0) {
                return;
            }
            console.log('刷新心跳');
            clearTimeout(timeout);
            timeout = setTimeout(close, this.config.timeout);
        }

        const close = () => {
            console.log('超时，断开链接');
            socket.close();
        }
        this.config.timeout && ping();

        socket.on('message', (data) => {
            const str = data.toString();
            // console.log(str);
            if (this.config.timeout && str === 'ping') {
                ping();
                return;
            }
            this.onMessage(client, str);
        });

        socket.on('close', () => {
            console.log('连接断开');
            clearTimeout(timeout);
        })
    }

    async onMessage(client: GameSocket, data: string) {
        try {
            const msg = JSON.parse(data);
            const [rid, route, req]: [number, string, any] = msg;

            const handler = this.handlers.get(route);

            if (!handler) {
                return;
            }

            const res = await handler(req, client);

            // 如果有返回值，那么直接回应
            if (res) {
                this.reply(client.socket, rid, res);
            }
        } catch (e) {
            console.error(e);
        }
    }

    on(path: string, handler: Handler) {
        this.handlers.set(path, handler);
    }

    /**
     * 发送消息到客户端
     * @param sokcet 
     * @param name 
     * @param data 
     */
    send(sokcet: WebSocket, name: string | number, data: any) {
        sokcet.send(JSON.stringify([1, name, data]));
    }

    /**
     * 给客户端回复消息
     * @param socket 
     * @param id 
     * @param data 
     */
    reply(socket: WebSocket, id: number, data: any) {
        console.log('reply', data);
        this.send(socket, id, data);
    }
}