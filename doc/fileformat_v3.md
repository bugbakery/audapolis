# Audapolis File Format Version 3

An audapolis document of file version 3 (named „audapolis document“ in the following text) consists of three things:
- Content
- Metadata
- Sources

## Content

The *content* of an audapolis document consists of a list of `DocumentItem`s.
The *content* list MAY NOT be empty.

Semantically the content is a number of sections.
At the moment, they can only be a "paragraph", meaning a list of `ParagraphItem`s and a speaker.
Every section MUST end with a `DocumentItem` of type `paragragraph_break`.

### `DocumentItem`s

There are 5 types of document items:
- `paragraph_break`
- `speaker_change`
- `text`
- `non_text`
- `artificial_silence`

Every document item MUST have an uuid in the `uuid` property in addition the properties described below.

#### `paragraph_break`

A `paragraph_break` marks the end of a paragraph and thus the end of a section.
It MAY occur in any place of the content, even directly following another paragraph break.
It has no additional properties.

#### `speaker_change`

A `speaker_change` changes the current speaker.
If present, it MUST be the first item in a section.
It has two additional properties:
- speaker
- language

The speaker MUST be a string.
It MAY NOT be the empty string.
It MAY NOT consist of only white space (as defined in [ECMAScript Section `TrimString`](https://tc39.es/ecma262/#sec-trimstring)).
It MAY otherwise contain the entire range of unicode characters.

The `language` MUST be a string or null.
It MUST be null or an ietf language code.
It MAY NOT be another value.

#### `text`

A `text` document item describes a bit of media and its associated text
(mostly a representation of what was spoken within this media snippet).

A `text` has the following additional properties:
1. `source`
2. `sourceStart`
3. `length`
4. `text`
5. `conf`

`source` contains the id of the media file the content is from.
A media document with this id MUST be `sources` of this document.

`sourceStart` marks the start of this snippet within the source in seconds.
It MUST be greater than zero.

`length` contains the length of the snippet in the source file in seconds.
It MUST be greater than zero.

`sourceStart` + `length` MAY NOT be larger than the length of the source file.

`text` contains text associated with the snippet.
It MUST be a string.
It MAY NOT be the empty string.
It MAY NOT consist of only white space (as defined in [ECMAScript Section `TrimString`](https://tc39.es/ecma262/#sec-trimstring)).
It MAY contain the entire range of unicode characters.
Applications MAY choose to ignore or not render certain white space characters, e.g. newlines.

`conf` contains the confidence that the text matches the snippet.
It MUST be a value in the inclusive range of 0 and 1, where 0 marks the lowest possible confidence and 1 marks the highest possible confidence.

#### `non_text`

A `non_text` document item describes a bit of media without associated text, e.g. silence, music or noise.

It has the same additional properties as `text` except for `text` and `conf`.

#### `artificial_silence`

An `artificial_silence` document item describes a snippet that has no source media.
It has neither associated audio nor video.
During playback, audapolis plays silence and shows the "No Video"-Icon.
During export, audapolis exports silence and a black video.

It has the following additional properties:
- `length`

`length` contains the length of the snippet in seconds.
It MUST be greater than zero.

### Conclusion

The document items describe above allow us to divide the `content` into sections.
A section can be up to one `speaker_change` followed by zero or more `text`, `non_text` or `aritifical_silence` item, finished by a `paragraph_break`.

## Metadata

In addition to the content, some metadata can be stored with the document:
- `display_video`
- `display_speaker_names`

`display_video` MUST be a boolean value and describes whether the videos SHOULD be shown when opening this document.

`display_speaker_names` MUST be a boolean values and describes whether the speaker names SHOULD be shown when opening this document.

## Sources

A source is a media file in an format that is supported by the version of electron/chrome used by audapolis.
It SHOULD be in one of the "safe formats".

Safe formats are formats that are known to provide accurate seeking and playback in electron.
At the time of writing those are:
- mp4
- wav

## On-Disk-Format

An audapolis document can be written to disk in a zip format.
The zip file SHOULD be saved with the extension ".audapolis".
It MUST contain the content and metadata as a file named `document.json` containing the JSON-representation of an object
with the following keys:
- `content` - a list of document items as described in section "Content"
- `metadata` - an object with the keys and values as described in section "Metadata"
- `version` - the number 3

If the document contains sources, a folder named `sources` MUST be present in the zip file.
In this folder, each source media file MUST be stored under its id without a file extension.

## Appendix A: Macro Items

The content can also be represented as `MacroItem`s.

This format is never stored on disk, but can be generated on the fly from the Content of a document.
Helper functions for this can be found in the audapolis source code.

At the moment, these can only be a `paragraph`.

Every macro item has a uuid in addition to the properties described below.

#### `paragraph`

A macro item of type paragraph has two additional properties:
1. `speaker`
2. `content`

The speaker MUST be a string.
The speaker MAY be the empty string.
The empty string represents that no speaker is set for this paragraph.

The content is a list of `ParagraphItem`s.
`ParagraphItem`s are `DocumentItem` of types `text`, `non_text`, and `artificial_silence`.
The content list MAY be empty, representing a paragraph with no content.
