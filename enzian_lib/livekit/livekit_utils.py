#!/usr/bin/env python3
"""
LiveKit utilities for token generation and room management.
This module replicates the token generation functionality from the web frontend.
"""

import os
import random
import logging
from typing import Dict, Optional
from dotenv import load_dotenv
from livekit import api, rtc
from livekit.api import AccessToken, VideoGrants
import datetime
import wave
import numpy as np

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()
load_dotenv(".env.dev", override=True)

class ConnectionDetails:
    """Connection details for LiveKit, similar to the web frontend structure"""
    def __init__(self, server_url: str, participant_token: str, participant_name: str, room_name: str = None):
        self.server_url = server_url
        self.participant_token = participant_token
        self.participant_name = participant_name

    def to_dict(self) -> Dict[str, str]:
        """Convert to dictionary format"""
        result = {
            "serverUrl": self.server_url,
            "participantToken": self.participant_token,
            "participantName": self.participant_name
        }

        return result




def create_participant_token(room_name: str, identity: str) -> str:
    """
    Create a participant token for LiveKit.
    Follows the official LiveKit documentation for token generation.

    Args:
        identity: Participant identity
        room_name: Room name

    Returns:
        JWT token string
    """
    # Get API key and secret from environment
    api_key = os.environ.get("LIVEKIT_API_KEY")
    api_secret = os.environ.get("LIVEKIT_API_SECRET")

    if not api_key or not api_secret:
        raise ValueError("LIVEKIT_API_KEY and LIVEKIT_API_SECRET must be set in environment")

    # Create access token
    at = AccessToken(api_key, api_secret)


    # Add grant
    grants = VideoGrants(
        room_join=True,
        room=room_name,
    )

    # Set identity and validity period
    at.with_grants(grants)
    at.with_identity(identity)

    # Return JWT
    return at.to_jwt()


def get_connection_details(room_name, identity: Optional[str] = None) -> ConnectionDetails:
    """
    Get connection details for LiveKit.
    Replicates the GET function from the web frontend.

    Args:
        identity: Optional participant identity, will generate a random one if not provided

    Returns:
        ConnectionDetails object
    """
    # Get LiveKit URL from environment
    livekit_url = os.environ.get("LIVEKIT_URL")

    if not livekit_url:
        raise ValueError("LIVEKIT_URL must be set in environment")

    # Generate participant identity if not provided
    if not identity:
        identity = f"voice_assistant_user_{random.randint(0, 10000)}"

    # Create participant token
    participant_token = create_participant_token(room_name, identity)

    # Return connection details
    return ConnectionDetails(
        server_url=livekit_url,
        participant_token=participant_token,
        participant_name=identity,
        room_name=room_name  # Store for reference only
    )

async def create_room(room_name, max_participants=10, empty_timeout=10*60):
    # Get LiveKit URL from environment
    livekit_url = os.environ.get("LIVEKIT_URL")

    if not livekit_url:
        raise ValueError("LIVEKIT_URL must be set in environment")

    async with api.LiveKitAPI(url=livekit_url ) as lkapi:
        return await lkapi.room.create_room(api.CreateRoomRequest(
        name=room_name,
        empty_timeout=empty_timeout,
        max_participants=max_participants,
    ))

async def delete_room(room_name):
       # Get LiveKit URL from environment
    livekit_url = os.environ.get("LIVEKIT_URL")

    if not livekit_url:
        raise ValueError("LIVEKIT_URL must be set in environment")


    async with api.LiveKitAPI(url=livekit_url) as lkapi:
       await lkapi.room.delete_room(api.DeleteRoomRequest(
            room=room_name
        ))


async def connect_participant(room_name, identity):
    token = create_participant_token(room_name, identity)

    livekit_url = os.environ.get("LIVEKIT_URL")

    if not livekit_url:
        raise ValueError("LIVEKIT_URL must be set in environment")

    room = rtc.Room()
    try:
        await room.connect(livekit_url, token)
    except Exception as e:
        logger.error(f"############ Connection failed: {e}")
        raise
    return room



async def play_audio_file(room: rtc.Room, audio_file_path: str):
    """Play an audio file through a LiveKit audio source

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
        publication = await room.local_participant.publish_track(track, options)

        frame_duration = 1  # seconds
        num_samples = sample_rate * frame_duration

        for _ in range(0, data_size, num_samples):
            frames = wav_file.readframes(num_samples)

            if not frames:
                break

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
        # try:
        #     await room.local_participant.unpublish_track(track)
        # except Exception as e:
        #     logger.error(f"Error unpublishing track: {e}")
