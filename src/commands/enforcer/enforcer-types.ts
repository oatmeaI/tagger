import { Tags } from "node-id3";

export type SearchConfig = {
    pattern: RegExp;
    fields: string[];
}[];

export enum TagNames {
    title = "title",
    artist = "artist",
    albumArtist = "albumArtist",
    album = "album",
    genre = "genre",
    track = "track",
    disc = "disc",
    releaseDate = "releaseDate",
    year = "year",
}

export type ITagMap = { [key in TagNames]: keyof Tags };

export type Config = {
    libraryRoot: string;
    limit: number;
    tagMap: ITagMap;
    searchConfigs: { [key: string]: SearchConfig };
    templates: { [key in TagNames]: string };
    filePath: string;
};

export type SongInfo = {
    title?: string;
    remixers?: { artist: string; type: string }[];
    qualifiers?: string[];
    artist?: string;
    featuredArtists?: string[];
    releaseTitle?: string;
    releaseType?: string;
    releaseQualifiers?: string[];
    releaseDate?: string;
    trackNumber?: string;
    trackTotal?: string;
    discNumber?: string;
    discTotal?: string;
    genre?: string;
    year?: string;
};

export type ChangeInfo = {
    [artist: string]: {
        [album: string]: {
            [file: string]: {
                [key: string]: {
                    now: string;
                    old: string;
                };
            };
        };
    };
};
