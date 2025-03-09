import { BaseServer } from "../BaseServer";
import { IServer, IServerConfig } from "../IServer";
import { Socket } from "../socket";
import { ServerWebSocket, Socket as TcpSocket } from "bun";
import { createWebsocketServer } from "../ws";

type SocketData = Record<string, any>;

export class WebSocketServer extends BaseServer<ServerWebSocket<SocketData>> implements IServer {

    constructor(private config: IServerConfig) {
        super();
    }

    start(): void {
        const ws = createWebsocketServer(this.config);
        ws.open((socket) => {
            const client = new Socket(this)
            for (let p in socket.data) {
                client.bind(p, socket.data[p])
            }
            this.clients.set(client.id, socket);
            this.sockets.set(client.id, client);
            socket.data.socketId = client.id;
            client.once('close', () => {
                socket.close();
            });
            this.emit('connect', client);
        });

        ws.message((socket, message) => {
            const client = this.sockets.get(socket.data.socketId)!;
            this.emit('message', client, message);
        });

        ws.close((socket) => {
            const client = this.sockets.get(socket.data.socketId)!;
            this.clients.delete(client.id);
            this.sockets.delete(client.id);
            this.emit('close', client)
        });
    }

    send(socket: ServerWebSocket<SocketData>, name: string | number, data: any): void {
        socket.send(JSON.stringify([1, name, data]));
    }

    isDebug: boolean = false;
}