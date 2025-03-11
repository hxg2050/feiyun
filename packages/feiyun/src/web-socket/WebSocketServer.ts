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
            const client = new Socket(this)

            const params = new URL(req.url as string, `http://${req.headers.host}/`).searchParams;

            const data: SocketData = {};
            for (const [key, value] of params) {
                client.bind(key, value);
            }

            this.clients.set(client.id, ws);
            this.sockets.set(client.id, client);

            client.once('close', () => {
                ws.close();
            });


            ws.on('message', (data, isBinary) => {
                this.emit('message', client, data);
            });

            ws.on('close', () => {
                this.clients.delete(client.id);
                this.sockets.delete(client.id);
                this.emit('close', client)
            });

            this.emit('connect', client);
        })
    }

    send(socket: WebSocket, name: string | number, data: any): void {
        socket.send(JSON.stringify([1, name, data]));
    }

    isDebug: boolean = false;
}