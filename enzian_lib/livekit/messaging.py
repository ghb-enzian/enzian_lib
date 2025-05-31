"""
Messaging system for standardized communication from agent backends to clients.

Example:
    from livekit_messaging import create_agent_builder

    agent = create_agent_builder()
    hangup_msg = agent.hangup("user_requested")

"""
import time
import uuid
import json
from typing import Dict, Any, Optional, Literal
from dataclasses import dataclass, asdict


Source = Literal['agent', 'client']

@dataclass
class Message:
    """Represents a standardized message between agent and client."""
    event: str
    data: Optional[Dict[str, Any]] = None
    source: Source = 'agent'
    id: Optional[str] = None
    timestamp: Optional[float] = None

    def __post_init__(self):
        """Generate ID and timestamp if not provided."""
        if self.id is None:
            self.id = str(uuid.uuid4())
        if self.timestamp is None:
            self.timestamp = time.time()

    def to_dict(self) -> Dict[str, Any]:
        """Convert the message to a dictionary format for JSON serialization."""
        return asdict(self)

    def to_json(self) -> str:
        """Convert the message to JSON string."""
        return json.dumps(self.to_dict())


def HANGUP(reason: str = "agent_initiated") -> Message:
        """Create a call hangup message.

        Args:
            reason: Reason for hangup. Common values:
                   - "agent_initiated" (default)
                   - "user_requested"
                   - "timeout"
                   - "error"

        Returns:
            AgentMessage for hangup event.
        """
        return Message(
            event="call.hangup",
            data={"reason": reason},
            source='agent'
        )

async def publish(room, msg: Message) -> None:
    """Publish an agent message to the room.

    Args:
        room: Room instance.
        msg: AgentMessage to publish.
    """
    data_bytes = msg.to_json().encode('utf-8')
    topic = f"{msg.event}"
    reliable = True
    await room.local_participant.publish_data(
         data_bytes,
         topic=topic,
         reliable=reliable
     )
