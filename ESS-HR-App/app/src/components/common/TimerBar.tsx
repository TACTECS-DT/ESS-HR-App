import React, {useEffect} from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import {useAppSelector} from '../../hooks/useAppSelector';
import {useAppDispatch} from '../../hooks/useAppDispatch';
import {stopTimer, tickTimer} from '../../store/slices/timerSlice';
import {colors, fontSize, spacing} from '../../config/theme';
import {navigationRef} from '../../navigation/navigationRef';

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function TimerBar() {
  const dispatch = useAppDispatch();
  const {running, taskName, elapsedSeconds} = useAppSelector(state => state.timer);

  // Tick every second while running
  useEffect(() => {
    if (!running) {return;}
    const interval = setInterval(() => dispatch(tickTimer()), 1000);
    return () => clearInterval(interval);
  }, [running, dispatch]);

  if (!running) {
    return null;
  }

  function handleBarPress() {
    if (navigationRef.isReady()) {
      navigationRef.navigate('MoreTab', {screen: 'Timer'});
    }
  }

  return (
    <TouchableOpacity style={styles.bar} onPress={handleBarPress} activeOpacity={0.85}>
      <Text style={styles.icon}>⏱</Text>
      <Text style={styles.taskName} numberOfLines={1}>
        {taskName ?? ''}
      </Text>
      <Text style={styles.time}>{formatTime(elapsedSeconds)}</Text>
      <TouchableOpacity
        onPress={e => {e.stopPropagation?.(); dispatch(stopTimer());}}
        style={styles.stopBtn}
        hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
        <Text style={styles.stopText}>■</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  icon: {fontSize: 16},
  taskName: {flex: 1, color: colors.white, fontSize: fontSize.sm, fontWeight: '600'},
  time: {color: colors.white, fontSize: fontSize.md, fontWeight: '700', fontVariant: ['tabular-nums']},
  stopBtn: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  stopText: {color: colors.white, fontSize: 12},
});
