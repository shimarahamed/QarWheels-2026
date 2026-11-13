import { isLoaded } from 'expo-font';
import { Text, type TextProps } from 'react-native';

export function VendorText({ heading, telemetry, style, ...props }: TextProps & { heading?: boolean; telemetry?: boolean }) {
  const family = telemetry ? 'VendorTelemetry' : heading ? 'VendorHeading' : 'VendorBody';
  return <Text {...props} style={[isLoaded(family) && { fontFamily: family }, style]} />;
}
