import React, {useState, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {useTranslation} from 'react-i18next';

import ScreenHeader from '../../components/common/ScreenHeader';
import {useTheme} from '../../hooks/useTheme';
import {spacing, fontSize, colors, radius} from '../../config/theme';

interface Message {
  id: number;
  from: 'user' | 'hr';
  text: string;
  text_ar: string;
}

const DEMO_MESSAGES: Message[] = [
  {
    id: 1,
    from: 'user',
    text: 'Hi, I need to update my bank account details for salary transfer. How can I do that?',
    text_ar: 'مرحباً، أحتاج تحديث بيانات حسابي البنكي لتحويل الراتب. كيف يمكنني ذلك؟',
  },
  {
    id: 2,
    from: 'hr',
    text: "Hello Ahmed! Please submit a document request for 'Bank Details Update' with your new bank certificate attached. We'll process it within 2 business days.",
    text_ar: "مرحباً أحمد! يرجى تقديم طلب مستند لـ 'تحديث البيانات البنكية' مع إرفاق شهادة الحساب الجديد. سنقوم بالمعالجة خلال يومي عمل.",
  },
  {
    id: 3,
    from: 'user',
    text: "Thank you! I'll do that now.",
    text_ar: 'شكراً! سأقوم بذلك الآن.',
  },
];

export default function ChatHRScreen() {
  const {t, i18n} = useTranslation();
  const theme = useTheme();
  const isAr = i18n.language === 'ar';
  const scrollRef = useRef<ScrollView>(null);

  const [inputText, setInputText] = useState('');
  const [messages] = useState<Message[]>(DEMO_MESSAGES);

  const todayLabel = isAr ? 'اليوم، ٠٩:١٥ ص' : 'Today, 09:15 AM';

  return (
    <KeyboardAvoidingView
      style={{flex: 1, backgroundColor: theme.background}}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}>
      <ScreenHeader
        title={t('chat.title')}
        showBack
        right={
          <Text style={[styles.onlineStatus, {color: colors.success}]}>
            {'● '}{t('chat.online')}
          </Text>
        }
      />

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        style={styles.messageArea}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({animated: false})}>

        {/* Timestamp separator */}
        <Text style={[styles.timestamp, {color: theme.textSecondary}]}>{todayLabel}</Text>

        {messages.map(msg => {
          const isUser = msg.from === 'user';
          const text = isAr ? msg.text_ar : msg.text;
          return (
            <View
              key={msg.id}
              style={[styles.messageRow, isUser ? styles.messageRowRight : styles.messageRowLeft]}>
              <View
                style={[
                  styles.bubble,
                  isUser
                    ? [styles.bubbleUser, {backgroundColor: colors.primary}]
                    : [styles.bubbleHR, {backgroundColor: theme.surface, borderColor: theme.border}],
                ]}>
                <Text style={[styles.bubbleText, {color: isUser ? '#fff' : theme.text}]}>
                  {text}
                </Text>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Input bar */}
      <View style={[styles.inputBar, {backgroundColor: theme.surface, borderTopColor: theme.border}]}>
        <TouchableOpacity style={[styles.iconBtn, {backgroundColor: theme.background}]}>
          <Text style={styles.iconBtnText}>📎</Text>
        </TouchableOpacity>
        <TextInput
          style={[styles.input, {borderColor: theme.border, color: theme.text, backgroundColor: theme.background}]}
          placeholder={t('chat.placeholder')}
          placeholderTextColor={theme.textSecondary}
          value={inputText}
          onChangeText={setInputText}
          multiline={false}
          returnKeyType="send"
        />
        <TouchableOpacity style={[styles.sendBtn, {backgroundColor: colors.primary}]}>
          <Text style={styles.sendBtnText}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  messageArea: {flex: 1},
  messageList: {padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.sm},

  onlineStatus: {fontSize: fontSize.xs, fontWeight: '600'},

  timestamp: {
    textAlign: 'center',
    fontSize: 11,
    marginVertical: spacing.xs,
  },

  messageRow: {flexDirection: 'row', marginVertical: 3},
  messageRowRight: {justifyContent: 'flex-end'},
  messageRowLeft: {justifyContent: 'flex-start'},

  bubble: {
    maxWidth: '72%',
    padding: 10,
    paddingHorizontal: 14,
  },
  bubbleUser: {
    borderRadius: 16,
    borderBottomRightRadius: 4,
  },
  bubbleHR: {
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  bubbleText: {fontSize: 13, lineHeight: 19},

  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: 8,
    paddingHorizontal: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBtnText: {fontSize: 16},
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radius.round,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    fontSize: 13,
    maxHeight: 80,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnText: {color: '#fff', fontSize: 14},
});
