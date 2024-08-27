import { BaseServer } from "../BaseServer";
import { IServer } from "../IServer";
import { Socket } from "../socket";
import { Socket as TcpSocket } from "bun";

type SocketData = { socketId: number };

export class TcpServer extends BaseServer<TcpSocket<SocketData>> implements IServer {

    constructor(public port: number) {
        super();
    }

    start(): void {
        Bun.listen<SocketData>({
            hostname: "0.0.0.0",
            port: this.port,
            socket: {
                open: (socket) => {
                    const client = new Socket(this)
                    socket.data.socketId = client.id;
                    this.clients.set(client.id, socket)
                    this.sockets.set(client.id, client);
                },
                data: (socket, data) => {
                    const client = this.sockets.get(socket.data.socketId)!;
                    try {
                        this.handlerCallback?.(client, data.toString())
                    } catch (error) {
                        console.error(error)
                    }
                },
                close: (socket) => {
                    this.sockets.delete(socket.data.socketId);
                }
            },
        });
    }

    send(socket: TcpSocket<SocketData>, name: string | number, data: any): void {
        socket.write(JSON.stringify([1, name, data]));
    }

    isDebug: boolean = false;
}