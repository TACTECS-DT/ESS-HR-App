import {I18nManager, StyleSheet} from 'react-native';

/** True when the app is running in RTL mode (Arabic). */
export const isRTL = (): boolean => I18nManager.isRTL;

/**
 * Returns the correct flex direction based on RTL setting.
 * Use instead of hardcoding 'row'.
 */
export const rowDirection = (): 'row' | 'row-reverse' =>
  I18nManager.isRTL ? 'row-reverse' : 'row';

/**
 * RTL-aware start/end margin helpers.
 * 'start' means left in LTR and right in RTL.
 */
export function marginStart(value: number): {marginLeft?: number; marginRight?: number} {
  return I18nManager.isRTL ? {marginRight: value} : {marginLeft: value};
}

export function marginEnd(value: number): {marginLeft?: number; marginRight?: number} {
  return I18nManager.isRTL ? {marginLeft: value} : {marginRight: value};
}

export function paddingStart(value: number): {paddingLeft?: number; paddingRight?: number} {
  return I18nManager.isRTL ? {paddingRight: value} : {paddingLeft: value};
}

export function paddingEnd(value: number): {paddingLeft?: number; paddingRight?: number} {
  return I18nManager.isRTL ? {paddingLeft: value} : {paddingRight: value};
}

/** Text alignment based on RTL. */
export const textAlign = (): 'left' | 'right' =>
  I18nManager.isRTL ? 'right' : 'left';

/** Creates an RTL-aware StyleSheet with directional helpers applied. */
export const rtlStyles = StyleSheet.create({
  row: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
  },
  textAligned: {
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
});
