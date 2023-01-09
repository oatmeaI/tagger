import glob from "glob";


export const promisify = (fn: Function, ...args: any) =>
    new Promise((resolve, reject) => {
        try {
            fn(...args, (err: any) => {
                if (err) {
                    reject(err);
                }
                resolve(true);
            });
        } catch (err) {
            reject(err);
        }
    });

export const uniq = (arr: any[]) => [...new Set(arr)];

export function exists(value: any) {
    return !!value && (Array.isArray(value) ? value.length > 0 : true);
}

export const pipe =
    (...fns: Function[]) =>
    (...args: any[]) =>
        fns.reduce((args, func) => func(...args), args);

export function flattenArray<Type>(array: Array<Array<Type>>): Array<Type> {
    return array.reduce((acc, curr) => [...acc, ...(curr || [])], []);
}

export function zip<Type>(keys: Array<string | number>, values: Array<Type>): { [key: string]: Type } {
    return keys.reduce((zipped, key, index) => ({ ...zipped, [key]: values[index] }), {});
}

export function dotGet(path: string, obj: any) {
    const parts = path.split(".");
    return parts.reduce((obj: any, part) => obj?.[part], obj);
}

export function omit(obj: any, keys: string[]) {
    return Object.keys(obj)
        .filter((key) => !keys.includes(key))
        .reduce((ret: object, key) => ({ ...ret, [key]: obj[key] }), {});
}

export function include(obj: any, keys: string[]) {
    return Object.keys(obj)
        .filter((key) => keys.includes(key))
        .reduce((ret: object, key) => ({ ...ret, [key]: obj[key] }), {});
}

export function loadFiles(dir: string) {
    if (dir.endsWith("mp3")) return { files: [dir], mp3s: [dir] };

    const files = (glob.sync(`${dir}/**/*`) as string[]).filter((file) => file.includes("."));
    const mp3s = files.filter((file) => file.endsWith("mp3"));
    const endings = files.reduce((list: string[], file) => {
        const ending = file.substring(file.lastIndexOf("."));
        return !list.includes(ending) && ending.length < 6 ? [...list, ending] : list;
    }, []);

    return { files, mp3s, endings };
}

export function buildUrl(base: string, params: { [key: string]: string | number }) {
    const queryString = Object.keys(params).reduce((queryString, key) => `${queryString}&${key}=${params[key]}`, "");
    return `${base}?${queryString}`;
}
