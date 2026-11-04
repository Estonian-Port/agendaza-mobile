import { Redirect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';

export default function IndexScreen() {
  const { usuario, agendas, requiresOnboarding } = useAuth();

  if (!usuario) return <Redirect href="/login" />;
  if (requiresOnboarding) return <Redirect href="/complete-profile" />;

  return (
    <Redirect
      href={agendas.length > 1 && !usuario.empresaId ? '/seleccionar-agenda' : '/(tabs)/calendario'}
    />
  );
}