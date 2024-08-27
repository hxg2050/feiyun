import "reflect-metadata";
import { glob } from "glob";
import path from "node:path";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";

import type { Context, Feiyun, FeiyunMiddleware } from '@feiyun/server'
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

type DocOptions = {
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
export const ApiDoc = (options: DocOptions): MethodDecorator => {
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
export const getHandlers = async (rule = '**/*.handler.ts') => {
    const handlerPaths = await glob(rule);

    const handlers = [];

    for (let i = 0; i < handlerPaths.length; i++) {
        const handler = await import(handlerPaths[i]);
        if (handler.default) {
            handlers.push(handler.default);
        }
    }
    
    return handlers;
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
        const res = await handler.method(ctx.request.data, ctx);
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

export type IncludeOptions = {
    docPath: string
}

export type HandlerOptoons = { rule: string } & IncludeOptions;

export const createHandler = (app: Feiyun, options: HandlerOptoons) => {
    options = Object.assign({}, {
        docPath: 'doc'
    }, options)
    const isDebug = app.config.debug;
    

    /**
     * 自动导入应用文件
     * @param baseDir 应用文件夹
     * @param rule 导入路径规则
     * @returns 
     */
    const include = async (): Promise<FeiyunMiddleware> => {
        
        const handlers = await getHandlers(options.rule);

        const mapRoute = useMapRoute(handlers);

        const apis: {
            path: string,
            doc: DocOptions
        }[] = [];
        if (app.config.debug && options.docPath) {
            mapRoute.forEach((handler, path) => {
                apis.push({
                    path,
                    doc: handler.doc
                });
            });
        }
        return async (ctx, next) => {
            const handler = mapRoute.get(ctx.request.url);
            if (handler) {
                await runHandler(handler, ctx);
            }

            if (app.config.debug && ctx.request.url === options.docPath) {
                ctx.response.data = apis;
            }
            next();
        };
    }

    return include();
}