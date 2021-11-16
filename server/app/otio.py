from typing import List

import opentimelineio as otio
from opentimelineio.opentime import TimeRange, from_seconds
from pydantic import BaseModel


class Segment(BaseModel):
    speaker: str
    source_file: str
    source_length: float  # this is the total length of the media file
    has_video: bool

    source_start: float
    length: float  # this is the output length of the segment


def otio_seconds(s: float):
    return from_seconds(s, 30)


def convert_otio(timeline: List[Segment], timeline_name: str, adapter_name: str):
    tl = otio.schema.Timeline(name=timeline_name)
    aSpeakers = set(s.speaker for s in timeline)
    vSpeakers = set(s.speaker for s in timeline if s.has_video)
    aTracks = {}
    vTracks = {}
    for speaker in aSpeakers:
        if speaker in vSpeakers:
            vTrack = otio.schema.Track(
                name=f"{speaker} video",
                kind=otio.schema.TrackKind.Video,
            )
            tl.tracks.append(vTrack)
            vTracks[speaker] = vTrack
        aTrack = otio.schema.Track(
            name=f"{speaker} audio",
            kind=otio.schema.TrackKind.Audio,
        )
        tl.tracks.append(aTrack)
        aTracks[speaker] = aTrack

    for segment in timeline:
        ref = otio.schema.ExternalReference(
            target_url=segment.source_file,
            # available range is the content available for editing
            available_range=TimeRange(
                start_time=otio_seconds(0),
                duration=otio_seconds(segment.source_length),
            ),
        )

        def getClip():
            return otio.schema.Clip(
                name=segment.speaker,
                media_reference=ref,
                source_range=TimeRange(
                    start_time=otio_seconds(segment.source_start),
                    duration=otio_seconds(segment.length),
                ),
            )

        def getGap():
            return otio.schema.Gap(
                source_range=otio.opentime.TimeRange(
                    start_time=otio_seconds(0), duration=otio_seconds(segment.length)
                )
            )

        for speaker, aTrack in aTracks.items():
            if speaker == segment.speaker:
                aTrack.append(getClip())
            else:
                aTrack.append(getGap())
        for speaker, vTrack in vTracks.items():
            if speaker == segment.speaker and segment.has_video:
                vTrack.append(getClip())
            else:
                vTrack.append(getGap())

    return otio.adapters.write_to_string(tl, adapter_name=adapter_name)
