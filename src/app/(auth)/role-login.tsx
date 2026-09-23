import { Redirect } from 'expo-router';

/**
 * Ancienne URL conservée pour les liens déjà distribués. La connexion ne
 * demande plus de rôle : le compte est unique et l'espace commerçant est
 * privilégié automatiquement lorsqu'il existe.
 */
export default function RoleLogin() {
  return <Redirect href="/(auth)/login" />;
}
