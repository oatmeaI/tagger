# Tag Enforcer
A (still very much in-development) commandline tool to keep your MP3 tags in line.

## Goal
I have a pretty large MP3 collection, and I have a lot of specific preferences about how I want the metadata formatted - for example, I want featured artists in the `artist` field - not as part of the `title` field, and definitely not in the `albumArtist` field. I want the use of parenthesis and square brackets to be uniform throughout the collection...etc. I want a tool that enforce these conventions across my entire library for me.

## Usage
Because this is still very early days, I don't currently have a build process that actually produces an executable, so all the commands will be `yarn run...` commands.
1. `yarn run enforce -o <directory where your music is stored>` - This will scan through your library, and output a `changes.json` file with a list of every change Enforcer wants to make. You can then open this file and make any corrections.
    - `-q` will skip any files where Enforcer needs your input
2. `yarn run enforce -c <path to changes.json file>` - This will read a `changes.json` file and actually make the changes to the files on disk.
    - `-x` will not move files - by default Enforcer will try to enforce a consistent file structure.

- `yarn run enforce --config` will open the config file in your `$EDITOR`
- `yarn run enforce --paths` will print the paths to the config file, etc.
- `yarn run enforce --emptyCache` will delete the JSON cache files of which MP3s have been processed already, etc.

## Config
Eventually the goal is to have everything specified in `src/commands/enforcer/enforcer-config.ts` be user-configurable via the config file. Right now, it doesn't work quite right.

## Design Goals
- Infinitely customizable: Everyone has different preferences about this stuff; while in some cases enforcing conventions is good, a music collection is (usually) a very personal thing where personal preferences are more important than universal conventions.
- The filesystem is the source of truth: An issue I used to constantly have with iTunes is that if you changed anything on disk, it might not reflect in the iTunes library, or the file might disappear entirely. I'm not trying to build a full featured music manager here, just a tool to massage the ID3 data. Therefore, the source of truth should always be the actual files themselves.

## Algorithm
For each file in the given directory:
- Read the file's ID3 tags into memory
- Do our best to parse the information in the tags into an internal representation
    - Why have a separate internal data model? I want to track things that ID3 doesn't have a field for - eg. is it a "Bonus track" or a "2003 Remaster"? By putting these into an internal data model, the user can then add that data back to the tags however they want - for example, I want "Bonus Track" in square brackets, not parenthesis - or throw it out entirely if they don't care.
- Reformat the metadata into ID3 tags according to the user's preferences
- Write the changes to a commit file

## Roadmap
As I mentioned above, this project is still very rough and in-progress. There's a lot to do before it's ready even for just me to use it. This is by no means a comprehensive list, but it's a starting point.

### Features
- [ ] Fetch missing info: If a track is missing information, we should search the MusicBrainz, Spotify, Last.FM and (maybe?) SoundCloud and Bandcamp APIs to see if we can get the missing information. We'll want to have a heuristic for finding the best matches, and give the user a choice for which source to use.
- [ ] Album art fetcher: Ideally album art will come from :point_up: above - but if we can't find the track in question, it would be cool to try to search Unsplash for something related to the title of the track and use that.
- [ ] Add a tool to basically run the :point_up: fetcher on all tracks and try to find *incorrect* metadata, and try to correct it. Could use sonic fingerprinting / Acousticbrainz for this as well.
- [ ] Find albums with missing tracks list the missing tracks
- [ ] Find duplicate tracks (with some options for artist / album and fuzzy matching)
- [ ] Some sort of solution for standardizing the `Genre` tag - I'm not sure exactly how to do this yet.
- [ ] Some kind of "quickstart wizard" to create config files etc.
- [ ] If we can accurately track changes we've made, we could create a "rollback" feature as well.

### Improvements / Bugs
- [ ] There should be tests.
- [ ] Should consider using a SQLite database instead of the huge JSON files I have been using. Possibly creating a whole database to store tracks and tags, but I want to be careful about that, because I do want the filesystem itself to stay the source of truth. But using a database could improve performance a LOT, so...
- [ ] Need to make the user-defined config usable - currently it doesn't merge with the default config correctly.
- [ ] Improve the text output and input - make it better formatted, easier to read, etc.

### Code Cleanup
There are some parts of the code that I sorta feverishly threw together in the middle of the night that are a little...messy:
- [ ] The string template parser is pretty messy. It should at least be cleaned up, but I wonder if there's a better solution in the form of a library somewhere?
- [ ] There are some `any` types floating around - I'd like to clean all those up as well.
- [ ] The main `enforcer.ts` file is getting pretty unwieldy; it should be broken up into smaller pieces.

### Other
- [ ] A new name - this is a working title :P

## Prior Art
[beets](https://beets.io/) is an incredible tool, and it's auto-tagger is incredible. I started this project because a) beets is meant to manage your entire music library - like a CLI iTunes, and I just wanted a tool to do the auto-tagging, and b) the auto-tagger is not a customizable as I would like.
[Picard](https://picard.musicbrainz.org/) is closer to what I want - it's just a tagger - but since it only searches MusicBrainz, the results are often subpar, and again, I'm not able to customize the format as much as I want.
