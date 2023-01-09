import Tagger, { Tags } from "node-id3";
import hash from "js-sha1";
import { loadFiles } from "../../utils/utils.js";
import { TagMap } from "./enforcer-config.js";
import {
    diffTags,
    findInfo,
    getNumbers,
    loadConfig,
    move,
    paths,
    readJson,
    scrubField,
    write,
} from "./enforcer-helpers.js";
import { ChangeInfo, SearchConfig, SongInfo, TagNames } from "./enforcer-types.js";
import { parseTemplate } from "./parser.js";
import { ChangeCache, ChoiceCache } from "./enforcer-storage.js";
import { spawn } from "child_process";
import { rmSync } from "fs";
import { prompt } from "../../utils/io.js";

const GlobalConfig = loadConfig();
ChoiceCache.load();
ChangeCache.load();

// TODO - Release type (EP, Single, etc)
// TODO - Genre
// TODO - the casing should be configurable too
// TODO - this will load user config from somewhere and merge with base config
// TODO - string template path
function buildSongInfo(tags: Tags): SongInfo {
    const { searchConfigs } = GlobalConfig;
    const songInfo = Object.keys(searchConfigs).reduce((songInfo, configKey) => {
        const config: SearchConfig = searchConfigs[configKey];
        return { ...songInfo, [configKey]: findInfo({ tags, config }) };
    }, {});

    const title = scrubField({ fieldName: "title", field: tags.title, searchConfigs });
    const artist = scrubField({ fieldName: "artist", field: tags.artist, searchConfigs });
    const [trackNumber, trackTotal] = getNumbers(tags.trackNumber);
    const [discNumber, discTotal] = getNumbers(tags.partOfSet);
    const releaseDate =
        tags.releaseTime && tags.releaseTime !== "undefined"
            ? tags.releaseTime
            : false || tags.originalReleaseTime || tags.recordingTime || tags.year; //hack to fix something i broke
    const releaseTitle = scrubField({ fieldName: "album", field: tags.album, searchConfigs });
    const genre = tags.genre || "";

    return {
        ...songInfo,
        title,
        artist,
        releaseTitle,
        trackNumber,
        trackTotal,
        discNumber,
        discTotal,
        releaseDate,
        year: releaseDate && releaseDate.substring(0, releaseDate.indexOf("-")),
        genre,
    };
}

function formatTags(info: SongInfo, quiet = false): any {
    const { templates } = GlobalConfig;
    return Object.keys(templates).reduce((tags, infoKey: TagNames) => {
        const id3Key = TagMap[infoKey];
        const template = templates[infoKey];
        const value = parseTemplate(template, info, quiet);
        return !!value && value !== "undefined" ? { ...tags, [id3Key]: value } : tags;
    }, {});
}

async function commit(changes: ChangeInfo, options: { noMove: boolean }) {
    for (const artist in changes) {
        for (const release in changes[artist]) {
            for (const fileName in changes[artist][release]) {
                const file = changes[artist][release][fileName];
                const newTags = Object.keys(file).reduce((tags, key) => ({ ...tags, [key]: file[key].now }), {});
                Tagger.update(newTags, fileName);
                if (file.path && !options.noMove) await move(fileName, file.path.now);
                const hashKey = hash(file.path.now);
                ChangeCache.setValue(hashKey, newTags);
            }
        }
    }
}

export async function enforce(
    dir: string,
    options: {
        paths: boolean;
        emptyCache: boolean;
        config: boolean;
        commit: boolean;
        force: boolean;
        out: boolean;
        quiet: boolean;
        noMove: boolean;
    }
) {
    if (options.emptyCache) {
        // TODO - clean this up, utility for doing stuff to caches
        const choiceCachePath = `${paths.data}/${ChoiceCache._filename}`;
        const changeCachePath = `${paths.data}/${ChangeCache._filename}`;
        const shouldDelete = prompt({ message: `Really delete ${choiceCachePath}?` });
        if (shouldDelete) {
            console.log(`Deleting ${choiceCachePath}`);
            rmSync(choiceCachePath);
        }
        const shouldDelete1 = prompt({ message: `Really delete ${choiceCachePath}?` });
        if (shouldDelete1) {
            console.log(`Deleting ${changeCachePath}`);
            rmSync(changeCachePath);
        }
        process.exit(0);
    }

    if (options.config) {
        const editor = process.env.EDITOR || "vim";
        const child = spawn(editor, [paths.configFile], {
            stdio: "inherit",
        });

        child.on("exit", function () {
            process.exit(0);
        });
        return;
    }

    if (options.commit) {
        const changes = readJson(dir);
        await commit(changes, options);
        await move(dir, `${dir.substring(0, dir.lastIndexOf(".") - 1)}-COMMITTED.json`);
        process.exit(0);
    }

    if (options.paths) {
        console.log(paths);
        process.exit(0);
    }

    if (!dir) {
        throw new Error("Input directory required.");
    }

    if (!GlobalConfig.libraryRoot) {
        throw new Error("No library root configured.");
    }

    const mp3s = loadFiles(dir);
    const changes: ChangeInfo = {};

    let i = 0;
    console.log("\n");
    for (const file of mp3s) {
        if (GlobalConfig.limit > 0 && i >= GlobalConfig.limit) break;

        const hashKey = hash(file);
        if (ChangeCache.getValue(hashKey)) continue; // TODO - this could be more elegant; right now we just skip anything that we have processed before.

        const tags = Tagger.read(file);

        console.log(`->\t${tags.title}\n\tby ${tags.artist}\n\ton ${tags.album}\n`);

        const songInfo = buildSongInfo(tags);
        let newTags: any;
        try {
            newTags = formatTags(songInfo, options.quiet);
        } catch (e) {
            console.log("Error thrown, skipping (probably because quiet mode is on).");
            continue;
        }

        const idealPath = `${GlobalConfig.libraryRoot}/${parseTemplate(GlobalConfig.filePath, songInfo)}.mp3`;

        if (!diffTags(newTags, tags) && idealPath === file) continue;
        i++;
        changes[songInfo.artist] = {
            ...(changes[songInfo.artist] || {}),
            [songInfo.releaseTitle]: {
                ...(changes[songInfo.artist]?.[songInfo.releaseTitle] || {}),
                [file]: Object.keys(newTags).reduce((changes, tagName: keyof Tags) => {
                    return newTags[tagName] === tags[tagName]
                        ? changes
                        : { ...changes, [tagName]: { old: tags[tagName], now: newTags[tagName] } };
                }, {}),
            },
        };

        if (idealPath !== file)
            changes[songInfo.artist][songInfo.releaseTitle][file].path = { old: file, now: idealPath };

        const currentChanges = changes[songInfo.artist][songInfo.releaseTitle][file];
        Object.keys(currentChanges).map((key) =>
            console.log(`\t${key}: ${currentChanges[key].old} -> ${currentChanges[key].now}`)
        );
        console.log("\n");
    }
    if (options.force) await commit(changes, options);
    if (options.out) {
        const filename = `./changes-${Date.now()}.json`;
        console.log(`Saving changes file as ${filename}...`);
        await write(filename, JSON.stringify(changes));
    }
    await ChoiceCache.save();
    await ChangeCache.save();
    process.exit(0);
}
