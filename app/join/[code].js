import { useLocalSearchParams } from 'expo-router';

import { JoinScreen } from '../../src/screens/JoinScreen';

export default function JoinRoute() {
  const { code } = useLocalSearchParams();
  return <JoinScreen code={String(code ?? '')} />;
}
