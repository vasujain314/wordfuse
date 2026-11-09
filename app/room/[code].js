import { useLocalSearchParams } from 'expo-router';

import { normalizeRoomCode } from '../../src/multiplayer/roomCode';
import { RoomScreen } from '../../src/screens/room/RoomScreen';

export default function RoomRoute() {
  const { code } = useLocalSearchParams();
  return <RoomScreen code={normalizeRoomCode(code)} />;
}
