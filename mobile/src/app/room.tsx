import { Redirect, useLocalSearchParams } from 'expo-router';

// Preserve invitations sent by the Kotlin application.
export default function RoomInvite() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  return (
    <Redirect href={{ pathname: '/rooms', params: { code: code ?? '' } }} />
  );
}
