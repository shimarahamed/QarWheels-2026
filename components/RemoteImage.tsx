import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, View } from 'react-native';
import type { ImageStyle, StyleProp } from 'react-native';

import { useQarColors } from '@/lib/store';

type IconName = ComponentProps<typeof Ionicons>['name'];

// ─── Remote image ────────────────────────────────────────────────────────────
// Plain <Image source={{ uri }} /> renders nothing at all when the URL 404s,
// the device is offline, or the request times out — leaving a silent hole in
// the layout. Several seeded Unsplash URLs had in fact expired, which is how
// this surfaced.
//
// This wrapper always occupies its space: a spinner while loading, and a
// themed icon tile if the image never arrives.

export function RemoteImage({
  uri,
  style,
  fallbackIcon = 'image-outline',
  accessibilityLabel,
  resizeMode = 'cover',
}: {
  uri?: string | null;
  style?: StyleProp<ImageStyle>;
  /** Shown when the image fails; pick one that suits the subject. */
  fallbackIcon?: IconName;
  accessibilityLabel?: string;
  resizeMode?: 'cover' | 'contain' | 'center';
}) {
  const c = useQarColors();
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);

  // A changed uri is a fresh attempt — otherwise a recycled row in a list
  // keeps the previous item's failure state.
  useEffect(() => {
    setFailed(false);
    setLoading(Boolean(uri));
  }, [uri]);

  const showFallback = failed || !uri;

  if (showFallback) {
    return (
      <View
        style={[style, styles.center, { backgroundColor: c.surfaceAlt }]}
        accessible={Boolean(accessibilityLabel)}
        accessibilityRole="image"
        accessibilityLabel={accessibilityLabel}
      >
        <Ionicons name={fallbackIcon} size={22} color={c.muted} />
      </View>
    );
  }

  return (
    <View style={[style, styles.wrap, { backgroundColor: c.surfaceAlt }]}>
      <Image
        source={{ uri }}
        style={StyleSheet.absoluteFill as StyleProp<ImageStyle>}
        resizeMode={resizeMode}
        onError={() => { setFailed(true); setLoading(false); }}
        onLoadEnd={() => setLoading(false)}
        accessible={Boolean(accessibilityLabel)}
        accessibilityLabel={accessibilityLabel}
      />
      {loading ? (
        <ActivityIndicator size="small" color={c.muted} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  center: { alignItems: 'center', justifyContent: 'center' },
});
