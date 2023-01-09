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

export function loadFiles(dir: string) {
    if (dir.endsWith("mp3")) return dir;

    const files = (glob.sync(`${dir}/**/*`) as string[]).filter((file) => file.includes("."));
    const mp3s = files.filter((file) => file.endsWith("mp3"));

    return mp3s;
}

export function buildUrl(base: string, params: { [key: string]: string | number }) {
    const queryString = Object.keys(params).reduce((queryString, key) => `${queryString}&${key}=${params[key]}`, "");
    return `${base}?${queryString}`;
}
