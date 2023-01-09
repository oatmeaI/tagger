import hash from "js-sha1";
import titlecase from "titlecase";
import { chooseFromList, input } from "../../utils/io.js";
import { exists, pipe } from "../../utils/utils.js";
import { ChoiceCache } from "./enforcer-storage.js";
import { SongInfo } from "./enforcer-types.js";

const singletonPattern = /\$\{(?<field>[^\}\s\@\|\?\%]+?)\}/g;
const listPattern = /\$\{(?<field>[^\?]+?)\|(?<open>.)(?<close>.)\}/g;
const bareListPattern = /\$\{(?<field>\w+?)\|(?<seperator>.)\}/g;
const conditionalPattern = /\$\{(?<field>\w+?)\?(?<content>[^\}]*?)\}/g;
const inputPattern = /\$\{\w+?\%(\w|\^|\.)+?\%\w+?\}/g;

/// SYNTAX
//// TAGS
///// - Raw string:     ${fieldName}
///// - List:           ${listName|delimiters}
///// - Conditional:    ${conditionalField?<output>} (<output> can be another expression)
///// - User Input:     ${conditionalField%<choices separated by ^>%fallback} (<choices> can be singles or lists)
///// - Complex Fields: ${fieldName.<property> @.<another property>}
///// - Title Case:     ${fieldName*^}
///// - Left Pad:       ${fieldName*0}

const MOD_MAP: { [key: string]: (input: string) => string } = {
    "^": (str: string) => titlecase(str),
    "0": (str: string) => str.padStart(2, "0"),
};

function parseStrings(template: string, info: SongInfo, ...args: any) {
    const tokens = [...template.matchAll(singletonPattern)].map((r) => r.groups?.field).filter((i) => !!i);

    return [
        tokens.reduce((result, token) => {
            const [key, mod] = token.split("*");
            const modFunc = mod ? MOD_MAP[mod] : (i: string) => i;
            return result.replaceAll(
                "${" + token + "}",
                `${modFunc(info[key as unknown as keyof SongInfo] as string)}`
            );
        }, template),
        info,
        ...args,
    ];
}

function parseLists(template: string, info: SongInfo, ...args: any) {
    const listTokens = [...template.matchAll(listPattern)]
        .map((r) => ({ field: r.groups?.field, open: r.groups?.open, close: r.groups?.close }))
        .filter((i) => !!i);

    return [
        listTokens.reduce((result, token) => {
            const parts = token.field.split(" ");
            const fieldWithMod = parts[0].split(".")[0];
            const [field, mod] = fieldWithMod.split("*");
            const modFunc = mod ? MOD_MAP[mod] : (i: string) => i;
            const subfields = parts.map((part) => part.split(".")[1]).filter((i) => !!i);
            const list = info[field as keyof SongInfo] as any;
            const replacements: string[] = list.reduce((replacements: string[], item: any) => {
                const content = subfields.length
                    ? subfields
                          .map((subfield) => {
                              const [key, mod] = subfield.split("*");
                              const modFunc = mod ? MOD_MAP[mod] : (i: string) => i;
                              return modFunc(item[key]);
                          })
                          .join(" ")
                    : modFunc(item);
                const replacement = `${token.open}${content}${token.close}`;
                return [...replacements, replacement];
            }, []);
            const find = "${" + token.field + `|${token.open}${token.close}` + "}";
            const replace = replacements.join(" ");
            return result.replaceAll(find, replace);
        }, template),
        info,
        ...args,
    ];
}

function parseBareLists(template: string, info: SongInfo, ...args: any) {
    const bareListTokens = [...template.matchAll(bareListPattern)]
        .map((r) => ({ field: r.groups?.field, seperator: r.groups?.seperator }))
        .filter((i) => !!i);

    return [
        bareListTokens.reduce((result, token) => {
            const find = "${" + token.field + `|${token.seperator}` + "}";
            const list = info[token.field as keyof SongInfo] as string[];
            const replace = list.join(token.seperator + " ");
            return result.replaceAll(find, replace);
        }, template),
        info,
        ...args,
    ];
}
function parseConditionals(template: string, info: SongInfo, ...args: any) {
    const conditionalTokens = [...template.matchAll(conditionalPattern)]
        .map((r) => ({ field: r.groups?.field, content: r.groups?.content }))
        .filter((i) => !!i);

    return [
        conditionalTokens.reduce((result, token) => {
            const content = token.content || info[token.field as keyof SongInfo];
            const list = info[token.field as keyof SongInfo] as string[];
            const find = "${" + token.field + `?${token.content}` + "}";
            const shouldReplace = exists(list); // Only replace if the replace value exists - if it's a list, only replace if the list has entries
            const replace = !shouldReplace ? "" : content;
            return result.replaceAll(find, replace as string);
        }, template),
        info,
        ...args,
    ];
}

function parseInputFields(template: string, info: SongInfo, quiet = false) {
    const tokens = [...template.matchAll(inputPattern)].map((r) => r[0]);
    return [
        tokens.reduce((result, token) => {
            const [conditionalKey, choiceTemplate, fallbackKey] = token.substring(2, token.length - 1).split("%");
            const hashKey = hash(JSON.stringify(info.releaseTitle) + conditionalKey + choiceTemplate + fallbackKey); // TODO - this whole function only works for album artist rn
            const prevChoice = ChoiceCache.getValue(hashKey);

            const condition = exists(info[conditionalKey as keyof SongInfo]);
            if (!condition) {
                const fallback = (info[fallbackKey as keyof SongInfo] as string) || "";
                return result.replace(token, fallback);
            }
            if (quiet && !prevChoice) {
                throw new Error("Quiet mode set, but user input required.");
            }
            const choices = choiceTemplate.split("^").reduce((choices, key) => {
                const [field, subfield] = key.split(".");
                const value = info[field as keyof SongInfo];
                const result = ((Array.isArray(value) ? value : [value]) as any[]).filter((i) => !!i);
                const next =
                    subfield && result.length > 0 ? result.map((item: any) => (item as any)[subfield]) : result;
                return [...choices, ...next];
            }, []);

            let replace =
                prevChoice ||
                chooseFromList({
                    message: `What should we use for the album artist for ${info.releaseTitle}?`, // TODO - configurable
                    list: [...choices, "Edit by hand"],
                });
            if (replace === "Edit by hand") {
                replace = input({ message: "Enter album artist: " });
            }
            if (!prevChoice) ChoiceCache.setValue(hashKey, replace); // TODO - optimize caching flow
            return result.replace(token, replace);
        }, template),
        info,
        quiet,
    ];
}

export function parseTemplate(template: string, info: SongInfo, quiet = false) {
    return pipe(
        parseStrings,
        parseLists,
        parseBareLists,
        parseConditionals,
        parseInputFields
    )(template, info, quiet)[0];
}
