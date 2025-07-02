#!/usr/bin/env python3
"""
LiveKit utilities for token generation and room management.
"""

import os
import random
import logging
from typing import Dict, Optional
from livekit import api, rtc
from livekit.api import AccessToken, VideoGrants
import wave
import numpy as np

# Module Level Logging
logger = logging.getLogger(__name__)


class ConnectionDetails:
    """Represents the connection details required for a LiveKit participant to connect to a room."""
    def __init__(self, server_url: str, participant_token: str, participant_name: str, room_name: str = None):
        """Initialize ConnectionDetails.

        Args:
            server_url: The URL of the LiveKit server.
            participant_token: The JWT token for the participant.
            participant_name: The name/identity of the participant.
            room_name: Optional room name (stored for reference, not used directly for connection).
        """
        self.server_url = server_url
        self.participant_token = participant_token
        self.participant_name = participant_name
        # Store room_name for reference, although not directly used for connection in the client side
        self.room_name = room_name


    def to_dict(self) -> Dict[str, str]:
        """Convert the connection details to a dictionary format used by some clients.

        Returns:
            A dictionary containing 'serverUrl', 'participantToken', and 'participantName'.
        """
        result = {
            "serverUrl": self.server_url,
            "participantToken": self.participant_token,
            "participantName": self.participant_name
        }

        return result

def create_participant_token(room_name: str, identity: str, api_key: Optional[str] = None, api_secret: Optional[str] = None) -> str:
    """
    Purpose: Generates a JWT token that a participant can use to join a specific LiveKit room.
             This token is required by the LiveKit client SDKs to authenticate and authorize a
             participant's connection.

    Usage:  Call this function with the desired room name and a unique identity for the participant.
            You can optionally provide the LiveKit API key and secret directly,
            or they will be read from the `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET` environment variables.
            The function returns the JWT token string.

    Documentation: https://docs.livekit.io/home/server/generating-tokens/

    Args:
        room_name: The name of the room the participant will join.
        identity: A unique identifier for the participant.
        api_key: Optional LiveKit API key. If not provided, reads from LIVEKIT_API_KEY env var.
        api_secret: Optional LiveKit API secret. If not provided, reads from LIVEKIT_API_SECRET env var.

    Returns:
        The JWT token string for the participant.

    Raises:
        ValueError: If both `api_key`/`api_secret` arguments and `LIVEKIT_API_KEY`/`LIVEKIT_API_SECRET` environment variables are missing.
    """
    # Get API key and secret from arguments or environment
    api_key = api_key if api_key is not None else os.environ.get("LIVEKIT_API_KEY")
    api_secret = api_secret if api_secret is not None else os.environ.get("LIVEKIT_API_SECRET")

    if not api_key or not api_secret:
        raise ValueError("LiveKit API key and secret must be provided via arguments or environment variables LIVEKIT_API_KEY/LIVEKIT_API_SECRET")

    # Create access token
    at = AccessToken(api_key, api_secret)

    # Add grant
    grants = VideoGrants(room_join=True, room=room_name)

    # Set identity and validity period
    at.with_grants(grants)
    at.with_identity(identity)

    # Return JWT
    return at.to_jwt()


def get_connection_details(room_name, identity: Optional[str] = None, livekit_url: Optional[str] = None, api_key: Optional[str] = None, api_secret: Optional[str] = None) -> ConnectionDetails:
    """
    Purpose: Retrieves a structured object containing the LiveKit server URL, a participant token, and the participant's name.
             This function is a convenience to bundle necessary information for connecting a participant to a room,
             similar to how a web frontend might provide these details.

    Usage:  Call this function with the room name. You can optionally provide a specific `identity` for the participant;
            if not provided, a random one will be generated. You can also optionally provide the `livekit_url`, `api_key`,
            and `api_secret` directly, or they will be read from environment variables (`LIVEKIT_URL`, `LIVEKIT_API_KEY`,
            `LIVEKIT_API_SECRET`). The function returns a `ConnectionDetails` object.

    Args:
        room_name: The name of the room the participant will join.
        identity: Optional participant identity. If not provided, a random one is generated.
        livekit_url: Optional LiveKit server URL. If not provided, reads from LIVEKIT_URL env var.
        api_key: Optional LiveKit API key. If not provided, reads from LIVEKIT_API_KEY env var.
        api_secret: Optional LiveKit API secret. If not provided, reads from LIVEKIT_API_SECRET env var.

    Returns:
        A ConnectionDetails object containing the necessary information for connecting a participant.

    Raises:
        ValueError: If the LiveKit URL is missing (neither provided as an argument nor found in the LIVEKIT_URL environment variable).
                    Propagates ValueError from `create_participant_token` if API key/secret are missing.
    """
    # Get LiveKit URL from arguments or environment
    livekit_url = livekit_url if livekit_url is not None else os.environ.get("LIVEKIT_URL")

    if not livekit_url:
        raise ValueError("LiveKit URL must be provided via argument or environment variable LIVEKIT_URL")

    # Generate participant identity if not provided
    if not identity:
        identity = f"voice_assistant_user_{random.randint(0, 10000)}"

    # Create participant token
    participant_token = create_participant_token(room_name, identity, api_key=api_key, api_secret=api_secret)

    # Return connection details
    return ConnectionDetails(
        server_url=livekit_url,
        participant_token=participant_token,
        participant_name=identity,
        room_name=room_name  # Store for reference only
    )

async def create_room(room_name: str, max_participants: int = 10, empty_timeout: int = 10*60, livekit_url: Optional[str] = None):
    """
    Purpose: Creates a new room on the LiveKit server.

    Usage: Call this asynchronous function with the desired `room_name`. You can optionally specify `max_participants` and `empty_timeout`. You can also optionally provide the `livekit_url`; otherwise, it will be read from the `LIVEKIT_URL` environment variable. The function returns the created room object from the LiveKit API.

    Args:
        room_name: The name of the room to create.
        max_participants: The maximum number of participants allowed in the room (default: 10).
        empty_timeout: The time in seconds before the room is closed if it becomes empty (default: 10*60 seconds).
        livekit_url: Optional LiveKit server URL. If not provided, reads from LIVEKIT_URL env var.

    Returns:
        The created room object from the LiveKit API (livekit.api.Room).

    Raises:
        ValueError: If the LiveKit URL is missing (neither provided as an argument nor found in the LIVEKIT_URL environment variable).
        api.ApiException: If there is an error communicating with the LiveKit API.
    """
    # Get LiveKit URL from arguments or environment
    livekit_url = livekit_url if livekit_url is not None else os.environ.get("LIVEKIT_URL")

    if not livekit_url:
        raise ValueError("LiveKit URL must be provided via argument or environment variable LIVEKIT_URL")

    async with api.LiveKitAPI(url=livekit_url ) as lkapi:
        return await lkapi.room.create_room(api.CreateRoomRequest(
        name=room_name,
        empty_timeout=empty_timeout,
        max_participants=max_participants,
    ))

async def delete_room(room_name, livekit_url: Optional[str] = None):
    """
    Purpose: Deletes an existing room on the LiveKit server.

    Usage: Call this asynchronous function with the `room_name` to be deleted. You can optionally provide the `livekit_url`; otherwise, it will be read from the `LIVEKIT_URL` environment variable.

    Args:
        room_name: The name of the room to delete.
        livekit_url: Optional LiveKit server URL. If not provided, reads from LIVEKIT_URL env var.

    Returns:
        None

    Raises:
        ValueError: If the LiveKit URL is missing (neither provided as an argument nor found in the LIVEKIT_URL environment variable).
        api.ApiException: If there is an error communicating with the LiveKit API.
    """
    # Get LiveKit URL from arguments or environment
    livekit_url = livekit_url if livekit_url is not None else os.environ.get("LIVEKIT_URL")

    if not livekit_url:
        raise ValueError("LiveKit URL must be provided via argument or environment variable LIVEKIT_URL")


    async with api.LiveKitAPI(url=livekit_url) as lkapi:
       await lkapi.room.delete_room(api.DeleteRoomRequest(
            room=room_name
        ))


async def connect_participant(room_name, identity, livekit_url: Optional[str] = None, api_key: Optional[str] = None, api_secret: Optional[str] = None):
    """
    Purpose: Connects a participant to a LiveKit room using the `livekit.rtc` client SDK.
             This is typically used for applications that need to directly interact as a participant
             (e.g., sending/receiving audio/video).

    Usage:  Call this asynchronous function with the `room_name` and `identity` of the participant.
            It generates a token internally using `create_participant_token`. You can optionally
            provide `livekit_url`, `api_key`, and `api_secret` directly, or they will be read
            from environment variables (`LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`).
            The function returns the connected `livekit.rtc.Room` object.

    Args:
        room_name: The name of the room to connect to.
        identity: The unique identifier for the participant.
        livekit_url: Optional LiveKit server URL. If not provided, reads from LIVEKIT_URL env var.
        api_key: Optional LiveKit API key. If not provided, reads from LIVEKIT_API_KEY env var.
        api_secret: Optional LiveKit API secret. If not provided, reads from LIVEKIT_API_SECRET env var.

    Returns:
        The connected `livekit.rtc.Room` object.

    Raises:
        ValueError: If the LiveKit URL or API key/secret are missing (neither provided as arguments nor found in environment variables).
        Exception: If the connection to the LiveKit server fails.
    """
    # Get LiveKit URL from arguments or environment
    livekit_url = livekit_url if livekit_url is not None else os.environ.get("LIVEKIT_URL")

    if not livekit_url:
        raise ValueError("LiveKit URL must be provided via argument or environment variable LIVEKIT_URL")

    # Create participant token, passing keys/secret if provided
    token = create_participant_token(room_name, identity, api_key=api_key, api_secret=api_secret)

    room = rtc.Room()
    try:
        await room.connect(livekit_url, token)
    except Exception as e:
        logger.error(f"############ Connection failed: {e}")
        raise
    return room


async def play_audio_file(room: rtc.Room, audio_file_path: str):
    """
    Purpose: Publishes and plays the content of a `.wav` audio file as an audio track within a connected LiveKit room.
    Usage: Call this asynchronous function with an active `livekit.rtc.Room` object and the file path to the `.wav` audio file. The function will read the audio data, create an audio source and track, publish it to the room, and send the audio frames.

    Args:
        room: LiveKit room
        audio_file_path: Path to the audio file
    """
    # Get audio duration
    with wave.open(audio_file_path, 'rb') as wav_file:
        channels = wav_file.getnchannels()
        sample_rate = wav_file.getframerate()
        data_size = wav_file.getnframes()

        source = rtc.AudioSource(sample_rate, channels)
        track = rtc.LocalAudioTrack.create_audio_track("audio", source)
        options = rtc.TrackPublishOptions()
        options.source = rtc.TrackSource.SOURCE_MICROPHONE
        _ = await room.local_participant.publish_track(track, options)

        frame_duration = 1  # seconds
        num_samples = sample_rate * frame_duration

        for _ in range(0, data_size, num_samples):
            frames = wav_file.readframes(num_samples)

            if not frames:
                break

            # Why the div 2:
            # The data is read as bytes. Each sample is a 16-bit integer (np.int16),
            # which is _2_ bytes. So, we divide the total number of bytes by 2
            # to get the number of audio samples.
            num_frames = len(frames) // 2

            buffer_aux = np.frombuffer(frames, dtype=np.int16)

            frame = rtc.AudioFrame.create(
                sample_rate = sample_rate,
                num_channels = channels,
                samples_per_channel = num_frames // channels
            )

            audio_data = np.frombuffer(frame.data, dtype=np.int16)
            np.copyto(audio_data, buffer_aux)

            await source.capture_frame(frame)

        try:
            await source.wait_for_playout()
        except Exception as e:
            logger.error(f"Error waiting for playout: {e}")

        try:
            await source.aclose()
        except Exception as e:
            logger.error(f"Error closing source: {e}")
