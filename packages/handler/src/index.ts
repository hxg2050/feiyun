import "reflect-metadata";
import { glob } from "glob";
import path from "node:path";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";

import type { Context, FeiyunMiddleware } from 'feiyun'
const PATH_METADATA = 'path';
const METHOD_METADATA = 'method';
const PARAM_METADATA = 'param';
const PARAM_VALIDATE_METADATA = 'param_validate'

/**
 * 类装饰
 * @param path 路径
 * @returns 
 */
export const Handler = (path?: string): ClassDecorator => {
    return target => {
        path = typeof path === 'undefined' ? target.name : path;
        Reflect.defineMetadata(PATH_METADATA, path, target);
    }
}

/**
 * 方法装饰
 * @param path 路径
 * @returns 
 */
export const Method = (path?: string): MethodDecorator => {
    return (target, key, descriptor: any) => {
        if (typeof key === 'string') {
            path = typeof path === 'undefined' ? key : path;
            Reflect.defineMetadata(METHOD_METADATA, path, descriptor.value);
        }
    }
}

/**
 * 参数装饰
 * @param name 参数名
 * @param checker 检查器/处理器
 * @returns 
 */
export const Param = (name: string, checker?: (val: any) => void): ParameterDecorator => {
    return (target, key, index) => {
        if (!key) {
            return;
        }

        const param = Reflect.get(target, key);
        let params = Reflect.getMetadata(PARAM_METADATA, param);
        if (!params) {
            params = [];
        }
        params.push([index, name, checker]);
        Reflect.defineMetadata(PARAM_METADATA, params, param);
    }
}

/**
 * 声明参数需要进行校验，并用目标类型重新实例
 * @param target 
 * @param key 
 * @param index 
 */
export const ParamType: ParameterDecorator = (target, key, index) => {
    if (!key) {
        return;
    }
    const types = Reflect.getMetadata("design:paramtypes", target, key);
    // console.log(Object.getOwnPropertyDescriptors(Reflect.ownKeys(types[index].prototype)));
    Reflect.defineMetadata(PARAM_VALIDATE_METADATA, types[index], Reflect.get(target, key));
}


const METHOD_DOC_METADATA = 'method_doc';

type Options = {
    /**
     * 标题
     */
    title: string
    /**
     * 描述
     */
    description: string
}
/**
 * 文档
 */
export const ApiDoc = (options: Options): MethodDecorator => {
    return (target, key, descriptor: any) => {
        Reflect.defineMetadata(METHOD_DOC_METADATA, options, descriptor.value);
    }
}


export const useMapRoute = (handlers: any[]) => {

    const all = new Map();

    for (let i = 0; i < handlers.length; i++) {
        console.log(handlers[i]);
        const handler = new handlers[i]();
        const prototype = Object.getPrototypeOf(handler) as ClassDecorator;
        // 取出路径
        const handlerPathMeta = Reflect.getMetadata(PATH_METADATA, prototype.constructor);
        const methods = Object.getOwnPropertyNames(prototype).filter(item => {
            // 构造函数，暂时不处理
            if (item === 'constructor') {
                return false;
            }
            return typeof Reflect.get(prototype, item) === 'function';
        });

        methods.forEach(methodName => {
            const method = Reflect.get(prototype, methodName);
            const methodPath = Reflect.getMetadata(METHOD_METADATA, method);
            if (!methodPath) {
                return;
            }
            const path = handlerPathMeta + '/' + methodPath;

            all.set(path, {
                method: method.bind(handler),
                validate: Reflect.getMetadata(PARAM_VALIDATE_METADATA, method),
                doc: Reflect.getMetadata(METHOD_DOC_METADATA, method),
            });
        })
    }

    return all;
}

/**
 * 异常抛出基类
 */
export class ResponseError extends Error {
    constructor(msg: string, public code = 500) {
        super(msg);
    }
}

const runHandler = async (handler: any, ctx: Context) => {
    if (handler.validate) {
        const errors = await validate(plainToInstance(handler.validate, ctx.request.data));
        if (errors.length > 0) {
            console.error(errors);
            ctx.response.data = {
                code: 500,
                msg: Object.values(errors![0].constraints!)[0]
            }
            return;
        }
    }

    try {
        const res = await handler.method(ctx.request.data, ctx.socket);
        if (res) {
            ctx.response.data = {
                data: res
            };
        }
    } catch (e) {
        if (e instanceof ResponseError) {
            ctx.response.data = {
                code: e.code,
                msg: e.message
            }
        } else {
            console.error(e);
        }
    }
}

/**
 * 自动导入应用文件
 * @param baseDir 应用文件夹
 * @param rule 导入路径规则
 * @returns 
 */
export const include = async (baseDir: string, rule = '**/*.handler.ts'): Promise<FeiyunMiddleware> => {
    // const dirs = await readdir(path);
    // const files = await findUp(path + '/' + rule);
    // console.log(files);
    console.log(path.resolve(baseDir, rule));
    const handlerPaths = await glob(path.resolve(baseDir, rule));

    const handlers = [];

    for (let i = 0; i < handlerPaths.length; i++) {
        const handler = await import(handlerPaths[i]);
        if (handler.default) {
            handlers.push(handler.default);
        }
    }

    const mapRoute = useMapRoute(handlers);

    return async (ctx, next) => {
        const handler = mapRoute.get(ctx.request.url);
        if (handler) {
            await runHandler(handler, ctx);
        }
        next();
    };
}