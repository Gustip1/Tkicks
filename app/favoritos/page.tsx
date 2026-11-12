import { FavoritosClient } from './FavoritosClient';

export const metadata = {
  title: 'Favoritos | Tkicks',
  description: 'Los productos que guardaste en Tkicks.',
  robots: { index: false },
};

export default function FavoritosPage() {
  return <FavoritosClient />;
}
