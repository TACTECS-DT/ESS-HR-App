import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';

import apiClient from '../../api/client';
import {isApiSuccess} from '../../types/api';
import ScreenHeader from '../../components/common/ScreenHeader';
import TextInput from '../../components/common/TextInput';
import Button from '../../components/common/Button';
import EmptyState from '../../components/common/EmptyState';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import {useTheme} from '../../hooks/useTheme';
import {useApiError} from '../../hooks/useApiError';
import {spacing, fontSize, colors, radius} from '../../config/theme';
import type {PersonalNote} from '../../api/mocks/personal-notes.mock';
import {API_MAP} from '../../api/apiMap';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatDate(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length !== 3) {return dateStr;}
  const month = MONTHS[parseInt(parts[1], 10) - 1] ?? '';
  return `${parseInt(parts[2], 10)} ${month}`;
}

function getMonthKey(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length < 2) {return dateStr;}
  return `${parts[0]}-${parts[1]}`;
}

function getMonthLabel(key: string): string {
  const parts = key.split('-');
  if (parts.length < 2) {return key;}
  const month = MONTHS[parseInt(parts[1], 10) - 1] ?? '';
  return `${month} ${parts[0]}`;
}

export default function PersonalNotesScreen() {
  const {t} = useTranslation();
  const theme = useTheme();
  const queryClient = useQueryClient();

  const {showError, showValidationError} = useApiError();

  const [selectedMonth, setSelectedMonth] = useState<string | 'all'>('all');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingNote, setEditingNote] = useState<PersonalNote | null>(null);
  const [titleField, setTitleField] = useState('');
  const [contentField, setContentField] = useState('');

  const {data, isLoading} = useQuery({
    queryKey: ['personal-notes'],
    queryFn: async () => {
      const res = await apiClient.get(API_MAP.personalNotes.list);
      return isApiSuccess(res.data) ? (res.data.data as PersonalNote[]) : [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (note: {id?: number; title: string; content: string}) => {
      if (note.id) {
        await apiClient.patch(API_MAP.personalNotes.byId(note.id), note);
      } else {
        await apiClient.post(API_MAP.personalNotes.list, note);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['personal-notes']});
      setModalVisible(false);
      setEditingNote(null);
      setTitleField('');
      setContentField('');
    },
    onError: (err) => showError(err),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(API_MAP.personalNotes.byId(id));
    },
    onSuccess: () => queryClient.invalidateQueries({queryKey: ['personal-notes']}),
    onError: (err) => showError(err),
  });

  const allNotes = data ?? [];

  // Build unique month tabs
  const monthKeys = Array.from(new Set(allNotes.map(n => getMonthKey(n.date)))).sort().reverse();

  const filtered = selectedMonth === 'all'
    ? allNotes
    : allNotes.filter(n => getMonthKey(n.date) === selectedMonth);

  function openAdd() {
    setEditingNote(null);
    setTitleField('');
    setContentField('');
    setModalVisible(true);
  }

  function openEdit(note: PersonalNote) {
    setEditingNote(note);
    setTitleField(note.title);
    setContentField(note.content);
    setModalVisible(true);
  }

  function handleSave() {
    if (!titleField.trim()) {
      showValidationError(t('personalNotes.title_field'));
      return;
    }
    saveMutation.mutate({
      id: editingNote?.id,
      title: titleField.trim(),
      content: contentField.trim(),
    });
  }

  function confirmDelete(id: number) {
    Alert.alert(t('common.delete'), `${t('common.confirm')}?`, [
      {text: t('common.cancel'), style: 'cancel'},
      {text: t('common.delete'), style: 'destructive', onPress: () => deleteMutation.mutate(id)},
    ]);
  }

  const tabs: Array<{key: string | 'all'; label: string}> = [
    {key: 'all', label: t('personalNotes.all')},
    ...monthKeys.map(k => ({key: k, label: getMonthLabel(k)})),
  ];

  if (isLoading) {
    return (
      <View style={[styles.container, {backgroundColor: theme.background}]}>
        <ScreenHeader title={t('personalNotes.title')} showBack />
        <View style={styles.skeletons}>
          {[0, 1, 2, 3].map(i => <LoadingSkeleton key={i} height={90} style={styles.skeleton} />)}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, {backgroundColor: theme.background}]}>
      <ScreenHeader title={t('personalNotes.title')} showBack />

      {/* Month filter tabs */}
      <View style={[styles.tabBar, {backgroundColor: theme.surface, borderBottomColor: theme.border}]}>
        <FlatList
          horizontal
          data={tabs}
          keyExtractor={tab => tab.key}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabList}
          renderItem={({item: tab}) => {
            const isActive = selectedMonth === tab.key;
            return (
              <TouchableOpacity
                style={[styles.tab, isActive && {borderBottomColor: colors.primary, borderBottomWidth: 2}]}
                onPress={() => setSelectedMonth(tab.key)}>
                <Text style={[styles.tabText, {color: isActive ? colors.primary : theme.textSecondary}]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => String(item.id)}
        ListEmptyComponent={<EmptyState title={t('personalNotes.empty')} />}
        contentContainerStyle={styles.list}
        renderItem={({item}) => (
          <TouchableOpacity
            style={[styles.noteCard, {backgroundColor: theme.surface, borderColor: theme.border}]}
            onPress={() => openEdit(item)}
            onLongPress={() => confirmDelete(item.id)}>
            <View style={styles.noteHeader}>
              <Text style={[styles.noteTitle, {color: theme.text}]} numberOfLines={1}>{item.title}</Text>
              <Text style={[styles.noteDate, {color: theme.textSecondary}]}>{formatDate(item.date)}</Text>
            </View>
            <Text style={[styles.noteContent, {color: theme.textSecondary}]} numberOfLines={3}>
              {item.content}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, {backgroundColor: colors.primary}]}
        onPress={openAdd}>
        <Text style={styles.fabText}>＋</Text>
      </TouchableOpacity>

      {/* Add / Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.modalSheet, {backgroundColor: theme.surface}]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, {color: theme.text}]}>
                {editingNote ? t('personalNotes.editNote') : t('personalNotes.addNote')}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={{color: theme.textSecondary, fontSize: fontSize.lg}}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView>
              <TextInput
                label={t('personalNotes.title_field')}
                placeholder={t('personalNotes.title_field')}
                value={titleField}
                onChangeText={setTitleField}
              />
              <TextInput
                label={t('personalNotes.content_field')}
                placeholder="..."
                value={contentField}
                onChangeText={setContentField}
                multiline
                numberOfLines={5}
              />
              <Button
                label={t('common.save')}
                onPress={handleSave}
                loading={saveMutation.isPending}
                fullWidth
              />
              <View style={{height: spacing.xl}} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  tabBar: {borderBottomWidth: StyleSheet.hairlineWidth},
  tabList: {paddingHorizontal: spacing.md, gap: spacing.sm},
  tab: {paddingVertical: spacing.sm, paddingHorizontal: spacing.xs},
  tabText: {fontSize: fontSize.sm, fontWeight: '600'},
  list: {padding: spacing.md, gap: spacing.sm, paddingBottom: 90},
  noteCard: {borderRadius: radius.lg, borderWidth: 1, padding: spacing.md, gap: spacing.xs},
  noteHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  noteTitle: {fontSize: fontSize.md, fontWeight: '700', flex: 1, marginRight: spacing.sm},
  noteDate: {fontSize: fontSize.xs},
  noteContent: {fontSize: fontSize.sm, lineHeight: 20},
  fab: {
    position: 'absolute',
    bottom: spacing.xl,
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 4},
  },
  fabText: {color: '#fff', fontSize: 28, lineHeight: 32},
  modalOverlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end'},
  modalSheet: {borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, maxHeight: '85%'},
  modalHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md},
  modalTitle: {fontSize: fontSize.lg, fontWeight: '700'},
  skeletons: {padding: spacing.md, gap: spacing.sm},
  skeleton: {borderRadius: radius.md},
});
