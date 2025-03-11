# 飞云游戏服务器框架(WebSocket)

## 快速开始
### 服务器
npm安装
```sh
npm install feiyun
```
使用`Application`创建一个长连接服务端应用
```ts
import { Application, Socket } from 'feiyun';
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
```

### 客户端使用
npm安装
```sh
npm install @feiyun/client
```
使用
```ts
import { FeiyunClient } from '@feiyun/client'

const client = new FeiyunClient({
    url: 'ws://127.0.0.1:3000?token=mytoken'
});
client.request('hello', {
    name: 'Youxia'
}).then((res) => {
    console.log(res);
})
```