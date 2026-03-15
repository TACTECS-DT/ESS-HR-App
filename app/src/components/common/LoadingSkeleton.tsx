import React, {useEffect, useRef} from 'react';
import {View, Animated, StyleSheet, ViewStyle} from 'react-native';
import {useTheme} from '../../hooks/useTheme';
import {radius} from '../../config/theme';

interface Props {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export default function LoadingSkeleton({
  width = '100%',
  height = 16,
  borderRadius = radius.sm,
  style,
}: Props) {
  const theme = useTheme();
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {toValue: 1, duration: 700, useNativeDriver: true}),
        Animated.timing(opacity, {toValue: 0.4, duration: 700, useNativeDriver: true}),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width: width as number,
          height,
          borderRadius,
          backgroundColor: theme.isDark ? '#3A3A3C' : '#E5E5EA',
          opacity,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  skeleton: {},
});
