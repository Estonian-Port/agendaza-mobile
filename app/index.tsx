import { Redirect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';

export default function IndexScreen() {
  const { usuario, agendas, requiresOnboarding, requiresPasswordChange } = useAuth();

  if (requiresOnboarding) return <Redirect href="/complete-profile" />;
  if (requiresPasswordChange) return <Redirect href="/cambiar-contrasena" />;
  if (!usuario) return <Redirect href="/login" />;

  return (
    <Redirect
      href={agendas.length > 1 && !usuario.empresaId ? '/seleccionar-agenda' : '/(tabs)/calendario'}
    />
  );
}