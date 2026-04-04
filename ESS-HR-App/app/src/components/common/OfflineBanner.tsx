import React, {useEffect, useState} from 'react';
import {Text, StyleSheet, Animated} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import {useTranslation} from 'react-i18next';
import {colors, fontSize, spacing} from '../../config/theme';
import {useAppSelector} from '../../hooks/useAppSelector';

export default function OfflineBanner() {
  const {t} = useTranslation();
  const [isOffline, setIsOffline] = useState(false);
  const serverDown = useAppSelector(state => state.connectivity.serverDown);
  const slideAnim = React.useRef(new Animated.Value(-50)).current;

  const visible = isOffline || serverDown;

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOffline(!state.isConnected);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: visible ? 0 : -50,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [visible, slideAnim]);

  if (!visible) {
    return null;
  }

  const message = isOffline
    ? `📡 ${t('common.noInternet')}`
    : `🔴 ${t('common.serverDown')}`;

  return (
    <Animated.View
      style={[styles.banner, {transform: [{translateY: slideAnim}]}]}>
      <Text style={styles.text}>{message}</Text>
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
