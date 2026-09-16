import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { colors } from '@/theme';

/**
 * Jeu d'icônes en trait, dessinées sur une grille 24×24.
 *
 * Volontairement inline plutôt qu'une bibliothèque d'icônes : Waffiy en
 * utilise une quinzaine, et une dépendance en embarquerait plusieurs milliers
 * dans le bundle. Le trait suit les proportions de Lucide, cohérentes avec le
 * prototype.
 */
export type IconName =
  | 'home'
  | 'cards'
  | 'bell'
  | 'user'
  | 'users'
  | 'activity'
  | 'settings'
  | 'qr'
  | 'scan'
  | 'chevron-right'
  | 'arrow-left'
  | 'close'
  | 'check'
  | 'plus'
  | 'minus'
  | 'gift'
  | 'store'
  | 'ticket'
  | 'alert'
  | 'wifi-off'
  | 'clock'
  | 'sun';

type IconProps = {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
};

export function Icon({
  name,
  size = 22,
  color = colors.ink,
  strokeWidth = 1.9,
}: IconProps) {
  const stroke = { stroke: color, strokeWidth, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'home' && (
        <Path d="m3 10.5 9-7.5 9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" {...stroke} />
      )}

      {name === 'cards' && (
        <>
          <Rect x="2" y="5" width="20" height="14" rx="2.5" {...stroke} />
          <Path d="M2 10h20" {...stroke} />
        </>
      )}

      {name === 'bell' && (
        <>
          <Path d="M18 8.5a6 6 0 1 0-12 0c0 6.5-2.5 8.5-2.5 8.5h17S18 15 18 8.5" {...stroke} />
          <Path d="M13.7 20.5a2 2 0 0 1-3.4 0" {...stroke} />
        </>
      )}

      {name === 'user' && (
        <>
          <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" {...stroke} />
          <Circle cx="12" cy="7" r="4" {...stroke} />
        </>
      )}

      {name === 'users' && (
        <>
          <Path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" {...stroke} />
          <Circle cx="9" cy="7" r="4" {...stroke} />
          <Path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" {...stroke} />
        </>
      )}

      {name === 'activity' && <Path d="M22 12h-4l-3 9L9 3l-3 9H2" {...stroke} />}

      {name === 'settings' && (
        <Path
          d="M4 21v-6M4 11V3M12 21v-9M12 8V3M20 21v-4M20 13V3M1.5 15h5M9.5 8h5M17.5 17h5"
          {...stroke}
        />
      )}

      {name === 'qr' && (
        <>
          <Rect x="3" y="3" width="7" height="7" rx="1.5" {...stroke} />
          <Rect x="14" y="3" width="7" height="7" rx="1.5" {...stroke} />
          <Rect x="3" y="14" width="7" height="7" rx="1.5" {...stroke} />
          <Path d="M14 14h3v3h-3zM20 14h1M14 20h3M20 17v4" {...stroke} />
        </>
      )}

      {name === 'scan' && (
        <Path
          d="M3 8V5.5A2.5 2.5 0 0 1 5.5 3H8M16 3h2.5A2.5 2.5 0 0 1 21 5.5V8M21 16v2.5a2.5 2.5 0 0 1-2.5 2.5H16M8 21H5.5A2.5 2.5 0 0 1 3 18.5V16M3 12h18"
          {...stroke}
        />
      )}

      {name === 'chevron-right' && <Path d="m9 18 6-6-6-6" {...stroke} />}
      {name === 'arrow-left' && <Path d="M19 12H5m0 0 6-6m-6 6 6 6" {...stroke} />}
      {name === 'close' && <Path d="M18 6 6 18M6 6l12 12" {...stroke} />}
      {name === 'check' && <Path d="M20 6 9 17l-5-5" {...stroke} />}
      {name === 'plus' && <Path d="M12 5v14M5 12h14" {...stroke} />}
      {name === 'minus' && <Path d="M5 12h14" {...stroke} />}

      {name === 'gift' && (
        <>
          <Path d="M20 12v9H4v-9" {...stroke} />
          <Rect x="2" y="7" width="20" height="5" rx="1.5" {...stroke} />
          <Path d="M12 21V7" {...stroke} />
          <Path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7ZM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7Z" {...stroke} />
        </>
      )}

      {name === 'store' && (
        <>
          <Path d="M3 9.5 4.5 4h15L21 9.5M3 9.5a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0M4.5 12v8h15v-8" {...stroke} />
        </>
      )}

      {name === 'ticket' && (
        <Path
          d="M3 9V6.5A1.5 1.5 0 0 1 4.5 5h15A1.5 1.5 0 0 1 21 6.5V9a3 3 0 0 0 0 6v2.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5V15a3 3 0 0 0 0-6Z"
          {...stroke}
        />
      )}

      {name === 'alert' && (
        <>
          <Path d="M12 3.5 2.5 20h19L12 3.5Z" {...stroke} />
          <Path d="M12 9.5v4.5M12 17.2v.1" {...stroke} />
        </>
      )}

      {name === 'wifi-off' && (
        <Path d="m2 2 20 20M8.5 16.5a5 5 0 0 1 7 0M5 13a10 10 0 0 1 3.5-2.3M19 13a10 10 0 0 0-4-2.6M2 8.8A15 15 0 0 1 7 6M22 8.8a15 15 0 0 0-9.5-2.7M12 20h.01" {...stroke} />
      )}

      {name === 'clock' && (
        <>
          <Circle cx="12" cy="12" r="9" {...stroke} />
          <Path d="M12 7v5l3 2" {...stroke} />
        </>
      )}

      {name === 'sun' && (
        <>
          <Circle cx="12" cy="12" r="4" {...stroke} />
          <Path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" {...stroke} />
        </>
      )}
    </Svg>
  );
}
