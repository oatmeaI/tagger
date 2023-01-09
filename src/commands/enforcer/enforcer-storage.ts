import { paths, readJson, write } from "./enforcer-helpers.js";

class DiskCache {
    _data: any = {};
    _filename: string;
    _name: string;

    get path() {
        // TODO - don't load config twice
        return `${paths.data}/${this._filename}`;
    }

    load() {
        try {
            console.log(`Loading ${this._name} cache...`);
            this._data = readJson(this.path);
        } catch (e) {
            console.log(`Couldn't load ${this._name} cache, using empty cache...`);
        }
    }

    async save() {
        console.log(`Saving ${this._name} cache...`);
        await write(this.path, JSON.stringify(this._data));
    }

    setValue(key: string, value: any) {
        this._data[key] = value;
        this.save();
    }

    getValue(key: string) {
        return this._data[key];
    }
}

// TODO - is it better to have one big file for all caches, or several smaller ones?
class _ChoiceCache extends DiskCache {
    _filename = "choices.json";
    _name = "choices";
}

class _ChangeCache extends DiskCache {
    _filename = "changes.json";
    _name = "changes";
}

const ChoiceCache = new _ChoiceCache();
const ChangeCache = new _ChangeCache();

export { ChangeCache, ChoiceCache };
