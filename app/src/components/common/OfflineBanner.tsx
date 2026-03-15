import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet, Animated} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import {useTranslation} from 'react-i18next';
import {colors, fontSize, spacing} from '../../config/theme';

export default function OfflineBanner() {
  const {t} = useTranslation();
  const [isOffline, setIsOffline] = useState(false);
  const slideAnim = React.useRef(new Animated.Value(-50)).current;

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const offline = !state.isConnected;
      setIsOffline(offline);
      Animated.timing(slideAnim, {
        toValue: offline ? 0 : -50,
        duration: 300,
        useNativeDriver: true,
      }).start();
    });
    return () => unsubscribe();
  }, [slideAnim]);

  if (!isOffline) {
    return null;
  }

  return (
    <Animated.View
      style={[styles.banner, {transform: [{translateY: slideAnim}]}]}>
      <Text style={styles.text}>📡 {t('common.noInternet')}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.error,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  text: {color: colors.white, fontSize: fontSize.sm, fontWeight: '600'},
});
