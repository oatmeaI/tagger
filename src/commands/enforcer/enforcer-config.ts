import { Config, ITagMap } from "./enforcer-types";

export const RemixerPatterns = [
    { pattern: /\((?<artist>[^\)]+?) (?<type>remix|edit|flip|version)\)/gi, fields: ["title"] }, // Bar (Foo Remix)
    { pattern: /\[(?<artist>[^\]]+?) (?<type>remix|edit|flip|version)\]/gi, fields: ["title"] }, // Bar [Foo Remix]
    { pattern: /- (?<artist>.+?) (?<type>remix|edit|flip|version)/gi, fields: ["title"] }, // Bar - Foo Remix
];

export const QualifierPatterns = [
    { pattern: /\((?<group>(live|bonus)[^\)]*)\)/gi, fields: ["title"] }, // Bar (Live at Red Rocks)
    { pattern: /\[(?<group>(live|bonus)[^\]]*)\]/gi, fields: ["title"] }, // Bar [Live at Red Rocks]
];

export const FeaturedArtistPatterns = [
    { pattern: /\(f(ea)?t. (?<group>[^\)]+?)\)/gi, fields: ["title", "artist", "album"] }, // Bar (ft. Ludacris)
    { pattern: /\sf(ea)?t. (?<group>.+)/gi, fields: ["title", "artist", "album"] }, // Bar ft. Ludacris
    { pattern: /\[f(ea)?t. (?<group>[^\]]+?)\]/gi, fields: ["title", "artist", "album"] }, // Bar [ft. Ludacris]
    { pattern: /\, (?<group>[^a-z][^\,]*)/g, fields: ["artist"] }, // Bar, Ludacris
];

export const ReleaseQualifierPatterns = [
    { pattern: /\[(?<group>[\]]+?) (ep|deluxe|remaster|re-release|edition|version)\]/gi, fields: ["album"] },
    { pattern: /(?<group> (ep|deluxe|remaster|re-release|edition|version|mix))/gi, fields: ["album"] },
];

// Map SongInfo to ID3 tags
export const TagMap: ITagMap = {
    title: "title",
    artist: "artist",
    albumArtist: "performerInfo",
    album: "album",
    genre: "genre",
    track: "trackNumber",
    disc: "partOfSet",
    year: "year",
    releaseDate: "originalReleaseTime",
};

export const DefaultConfig: Config = {
    libraryRoot: "",
    limit: 50,
    searchConfigs: {
        remixers: RemixerPatterns,
        qualifiers: QualifierPatterns,
        featuredArtists: FeaturedArtistPatterns,
        releaseQualifiers: ReleaseQualifierPatterns,
    },
    tagMap: TagMap,
    templates: {
        title: "${title}${remixers? }${remixers.artist @.type*^|()}${qualifiers? }${qualifiers*^|[]}",
        artist: "${artist}${featuredArtists? (ft. }${featuredArtists|,}${featuredArtists?)}",
        albumArtist: "${remixers%artist^remixers.artist%artist}",
        album: "${releaseTitle}",
        genre: "${genre}",
        disc: "${discNumber}${discTotal?/}${discTotal?}",
        track: "${trackNumber}${trackTotal?/}${trackTotal?${trackTotal}}",
        releaseDate: "${releaseDate?${releaseDate}}",
        year: "${year}",
    },
    filePath:
        "${artist}/${releaseTitle}/${trackNumber*0} ${title}${remixers? }${remixers.artist @.type*^|()}${qualifiers? }${qualifiers*^|[]}",
};
