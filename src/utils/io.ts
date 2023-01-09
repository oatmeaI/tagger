import { question } from "readline-sync";

type IOConfig = { message: string };
type Options = { [key: string]: any };

interface PromptConfig extends IOConfig {
    options?: Options;
    defaultAnswer?: any;
}
export function prompt({ message, options = { y: true, n: false }, defaultAnswer = true }: PromptConfig) {
    while (true) {
        const resp = question(`${message} (${Object.keys(options).join("/")}) `);
        if (resp.length == 0 && defaultAnswer) return defaultAnswer;
        if (options[resp.toLowerCase()] !== undefined) return options[resp.toLowerCase()];
        print({ message: "Choice not recognized." });
    }
}

interface InputConfig extends IOConfig {
    options?: Options;
}
export function input({ message, options = null }: InputConfig) {
    const input = question(message);
    if (options && options[input] !== undefined) return options[input];
    return input;
}

interface ListChoiceConfig extends IOConfig {
    list: Array<any>;
    options?: Options;
    returnIndex?: boolean;
    defaultAnswer?: any;
}
export function chooseFromList({
    message,
    list,
    options = null,
    returnIndex = false,
    defaultAnswer = null,
}: ListChoiceConfig) {
    list.forEach((item, index) => print({ message: `${index}: ${item}` }));
    while (true) {
        const resp = question(`${message}\nEnter a number: `);
        if (defaultAnswer && !resp) return defaultAnswer;
        if (options && options[resp] !== undefined) return options[resp];
        if (Number(resp) <= list.length) return returnIndex ? Number(resp) : list[Number(resp)];
    }
}

export function print(config: IOConfig | string) {
    const isObj = typeof config == "object";
    console.log(isObj ? config.message : config);
}
