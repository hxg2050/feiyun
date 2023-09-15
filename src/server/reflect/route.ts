import "reflect-metadata";

const METHOD_METADATA = 'method';
const PATH_METADATA = 'path';
const PARAM_METADATA = 'param';

/**
 * 类装饰
 * @param path 路径
 * @returns 
 */
export const Handler = (path?: string): ClassDecorator => {
    return target => {
        path = typeof path === 'undefined' ? '/' + target.name : path;
        Reflect.defineMetadata(PATH_METADATA, path, target);
    }
}

/**
 * 方法装饰
 * @param path 路径
 * @returns 
 */
export const Method = (path: string): ParameterDecorator => {
    return (target, key, descriptor: any) => {
        Reflect.defineMetadata(METHOD_METADATA, path, descriptor.value);
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

export const mapRoute = (handlers: any[]) => {

    const all = new Map();

    for (let i = 0; i < handlers.length; i++) {
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
            const path = handlerPathMeta + '/' + Reflect.getMetadata(METHOD_METADATA, method);
            all.set(path, method.bind(handler));
        })
    }

    return all;
}