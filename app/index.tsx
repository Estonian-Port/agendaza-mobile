import { Redirect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';

export default function IndexScreen() {
  const { usuario, agendas } = useAuth();

  if (!usuario) return <Redirect href="/login" />;

  return (
    <Redirect
      href={agendas.length > 1 && !usuario.empresaId ? '/seleccionar-agenda' : '/(tabs)/calendario'}
    />
  );
}