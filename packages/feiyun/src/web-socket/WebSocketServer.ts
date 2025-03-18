import { BaseServer } from "../BaseServer";
import { IServer, IServerConfig } from "../IServer";
import { Socket } from "../socket";
import { WebSocketServer as WSServer, WebSocket } from "ws";

type SocketData = Record<string, any>;

export class WebSocketServer extends BaseServer<WebSocket> implements IServer {

    constructor(private config: IServerConfig) {
        super();
    }


    start(): void {
        const wss = new WSServer({
            host: this.config.host,
            port: this.config.port,
        })
        wss.on('connection', (ws, req) => {
            const socket = new Socket(this)

            let timer: NodeJS.Timeout;
            const ping = () => {
                clearTimeout(timer);
                timer = setTimeout(socket.close.bind(socket), this.config.timeout)
            }

            if (this.config.timeout) {
                ping();
            }

            const params = new URL(req.url as string, `http://${req.headers.host}/`).searchParams;

            const data: SocketData = {};
            for (const [key, value] of params) {
                socket.bind(key, value);
            }

            this.clients.set(socket.id, ws);
            this.sockets.set(socket.id, socket);

            socket.once('close', (code: number = 1000) => {
                ws.close(code);
            });


            ws.on('message', (data, isBinary) => {
                // 心跳
                if (this.config.timeout) {
                    ping();
                }

                if (data.toString() === 'ping') {
                    return;
                }

                this.emit('message', socket, data);
            });

            ws.on('close', (event) => {
                this.clients.delete(socket.id);
                this.sockets.delete(socket.id);
                socket.close(event);
                clearTimeout(timer);
                this.emit('close', socket)
            });

            this.emit('connect', socket);
        })
    }

    send(socket: WebSocket, name: string | number, data: any): void {
        socket.send(JSON.stringify([1, name, data]));
    }

    isDebug: boolean = false;
}