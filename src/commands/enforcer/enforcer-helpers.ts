import { access, mkdir, readFileSync, rename, writeFileSync } from "fs";
import { Tags } from "node-id3";
import { uniq, promisify } from "../../utils/utils.js";
import { DefaultConfig } from "./enforcer-config.js";
import { Config, SearchConfig } from "./enforcer-types.js";
import envPaths from "env-paths";

const basePaths = envPaths("enforcer");

export const paths = {
    config: basePaths.config,
    data: basePaths.data,
    configFile: `${basePaths.config}/config.json`,
};

// Search a given string with each of the given patterns and return a single array
export function searchField(field: string, pattern: RegExp) {
    const matches = [...field.matchAll(pattern)];
    const strings = matches.map((match) => {
        return match.groups?.group || { ...match.groups };
    });
    return [...strings].filter((i) => !!i);
}

export function readJson(file: string) {
    return JSON.parse(readFileSync(file, { encoding: "utf-8" }));
}

export async function write(path: string, contents: any) {
    let exists;
    const dir = path.substring(0, path.lastIndexOf("/"));
    try {
        await promisify(access, dir);
        exists = true;
    } catch (e) {}

    if (!exists) await promisify(mkdir, dir, { recursive: true });
    writeFileSync(path, contents);
}

export async function move(file: string, path: string) {
    let exists;
    const newDir = path.substring(0, path.lastIndexOf("/"));
    try {
        await promisify(access, newDir);
        exists = true;
    } catch (e) {}

    if (!exists) await promisify(mkdir, newDir, { recursive: true });
    await promisify(rename, file, path);
}

export function scrubField({
    field,
    fieldName,
    searchConfigs,
}: {
    field: string;
    fieldName: keyof Tags;
    searchConfigs: { [key: string]: SearchConfig };
}): string {
    const allConfigs = Object.values(searchConfigs).filter((searchConfig) =>
        searchConfig.find((c) => c.fields.includes(fieldName))
    );
    return allConfigs
        .reduce((result, cx) => {
            const patterns = cx.filter((c) => c.fields.includes(fieldName)).map((c) => c.pattern);
            return patterns.reduce((innerResult, pattern) => innerResult.replace(pattern, ""), result);
        }, field)
        .trim();
}

export function findInfo({ tags, config }: { tags: Tags; config: SearchConfig }) {
    return uniq(
        config.reduce(
            (results, cx) => [
                ...results,
                ...cx.fields.reduce(
                    (results, key) => [...results, ...searchField(tags[key as keyof Tags] as string, cx.pattern)],
                    []
                ),
            ],
            []
        )
    );

    // return uniq(fields.reduce((results, key) => [...results, ...searchField(tags[key] as string, patterns)], []));
}

export function getNumbers(field: string) {
    return field ? field.split("/").map((i) => i) : [];
}

export const diffTags = (newTags: Tags, oldTags: Tags) => {
    return Object.keys(newTags).some((tagName: keyof Tags) => {
        return newTags[tagName] !== oldTags[tagName];
    }, true);
};

export function loadConfig(): Config {
    try {
        const userConfig = readJson(`${paths.config}/config.json`); // TODO - string literal, app name, JSON read & parse helper, directory
        console.log("-> Loaded user config...");
        return { ...DefaultConfig, ...userConfig };
    } catch (e) {
        console.log("-> Couldn't load user config, using default config...");
        return DefaultConfig;
    }
}
