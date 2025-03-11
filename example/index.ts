import { Applaction } from "../packages/feiyun/src";
import { Socket } from "../packages/feiyun/src/socket";

const app = new Applaction({
    port: 3000
});

app.start();

app.server.on('connect', (socket: Socket) => {
    console.log(socket);
    socket.close();
})