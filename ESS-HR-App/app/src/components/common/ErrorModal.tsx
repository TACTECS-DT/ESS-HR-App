/**
 * Odoo-style error modal.
 *
 * Structure:
 *   ┌──────────────────────────────────┐
 *   │  ⚠  Error Title             ✕   │  ← header
 *   ├──────────────────────────────────┤
 *   │  Main user-friendly message      │  ← always visible
 *   ├──────────────────────────────────┤
 *   │  [Show More ▾]         [OK]     │  ← footer
 *   └──────────────────────────────────┘
 *
 *   When "Show More" is toggled:
 *   ├──────────────────────────────────┤
 *   │  Code:   VALIDATION_ERROR        │
 *   │  HTTP:   400                     │  ← expands in same modal
 *   │  Detail: full message text       │
 *   └──────────────────────────────────┘
 */
import React, {useState} from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useTheme} from '../../hooks/useTheme';
import {colors, spacing, fontSize, radius} from '../../config/theme';

const {width: SCREEN_W} = Dimensions.get('window');

export interface ErrorModalProps {
  visible: boolean;
  title?: string;
  message: string;
  code?: string;
  httpStatus?: number;
  onClose: () => void;
}

export default function ErrorModal({
  visible,
  title,
  message,
  code,
  httpStatus,
  onClose,
}: ErrorModalProps) {
  const {t} = useTranslation();
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);

  const hasDetails = !!(code || httpStatus);
  const errorTitle = title || t('common.error');

  function handleClose() {
    setExpanded(false);
    onClose();
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, {backgroundColor: theme.surface}]}>

          {/* ── Header ───────────────────────────────────── */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.errorIcon}>⚠</Text>
              <Text style={[styles.headerTitle, {color: colors.error}]} numberOfLines={1}>
                {errorTitle}
              </Text>
            </View>
            <TouchableOpacity onPress={handleClose} hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
              <Text style={[styles.closeBtn, {color: theme.textSecondary}]}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.divider, {backgroundColor: colors.error + '33'}]} />

          {/* ── Message ──────────────────────────────────── */}
          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator={false}>
            <Text style={[styles.message, {color: theme.text}]}>{message}</Text>

            {/* ── Expandable dev details ────────────────── */}
            {expanded && hasDetails && (
              <View style={[styles.details, {backgroundColor: theme.background, borderColor: theme.border}]}>
                {code ? (
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, {color: theme.textSecondary}]}>
                      {t('common.errorCode', 'Code')}
                    </Text>
                    <Text style={[styles.detailValue, {color: theme.text}]}>{code}</Text>
                  </View>
                ) : null}
                {httpStatus ? (
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, {color: theme.textSecondary}]}>
                      {t('common.errorHttp', 'HTTP')}
                    </Text>
                    <Text style={[styles.detailValue, {color: theme.text}]}>{httpStatus}</Text>
                  </View>
                ) : null}
              </View>
            )}
          </ScrollView>

          <View style={[styles.divider, {backgroundColor: theme.border}]} />

          {/* ── Footer ───────────────────────────────────── */}
          <View style={styles.footer}>
            {hasDetails ? (
              <TouchableOpacity
                style={styles.showMoreBtn}
                onPress={() => setExpanded(e => !e)}>
                <Text style={[styles.showMoreText, {color: colors.primary}]}>
                  {expanded
                    ? `${t('common.showLess', 'Show Less')} ▴`
                    : `${t('common.showMore', 'Show More')} ▾`}
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.showMoreBtn} />
            )}
            <TouchableOpacity style={styles.okBtn} onPress={handleClose}>
              <Text style={styles.okText}>{t('common.ok', 'OK')}</Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  card: {
    width: Math.min(SCREEN_W - spacing.lg * 2, 440),
    borderRadius: radius.lg,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: {width: 0, height: 4},
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  errorIcon: {fontSize: 16, color: colors.error},
  headerTitle: {fontSize: fontSize.md, fontWeight: '700', flexShrink: 1},
  closeBtn: {fontSize: fontSize.md, fontWeight: '600', paddingLeft: spacing.sm},

  divider: {height: 1},

  body: {maxHeight: 220},
  bodyContent: {padding: spacing.md, gap: spacing.sm},
  message: {fontSize: fontSize.sm, lineHeight: 20},

  details: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.sm,
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  detailRow: {flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start'},
  detailLabel: {fontSize: fontSize.xs, fontWeight: '600', minWidth: 48},
  detailValue: {fontSize: fontSize.xs, flex: 1, fontFamily: 'monospace'},

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  showMoreBtn: {flex: 1},
  showMoreText: {fontSize: fontSize.sm, fontWeight: '600'},
  okBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.md,
  },
  okText: {color: '#fff', fontSize: fontSize.sm, fontWeight: '700'},
});
