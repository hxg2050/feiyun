import { FeiyunClient } from "../packages/client/src/FeiyunClient";
import { Application } from "../packages/feiyun/src";
import { Socket } from "../packages/feiyun/src/socket";

const app = new Application();
app.start();

app.server.on('connect', (socket: Socket) => {
    console.log(socket.data);
})

app.use(async (ctx, next) => {
    if (ctx.request.url === 'hello') {
        ctx.response.data = `你好 ${ctx.request.data.name}`;
    }
    next();
})

setTimeout(() => {
    const client = new FeiyunClient({
        url: 'ws://127.0.0.1:3000?token=mytoken'
    });
    client.request('hello', {
        name: 'Youxia'
    }).then((res) => {
        console.log(res);
    })
})