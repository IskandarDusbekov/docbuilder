import { Check } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Fonts, Radius, Spacing, useColors } from '@/theme';

type DialogProps = {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
};

export function Dialog({ visible, title, onClose, children }: DialogProps) {
  const colors = useColors();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior="padding" style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Yopish" />
        <View style={[styles.card, { backgroundColor: colors.background }]}>
          <AppText variant="heading">{title}</AppText>
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

type PromptProps = {
  visible: boolean;
  title: string;
  initialValue?: string;
  placeholder?: string;
  submitLabel?: string;
  onSubmit: (value: string) => void;
  onClose: () => void;
};

// Android'da Alert.prompt yo'q, shuning uchun matn kiritish oynasi o'zimizniki.
export function PromptDialog({ visible, ...rest }: PromptProps) {
  // Har ochilishda boshlang'ich qiymatdan boshlash uchun ichki qism qayta yaratiladi.
  return visible ? <PromptBody {...rest} /> : null;
}

function PromptBody({ title, initialValue = '', placeholder, submitLabel = 'Saqlash', onSubmit, onClose }: Omit<PromptProps, 'visible'>) {
  const colors = useColors();
  const [value, setValue] = useState(initialValue);
  const trimmed = value.trim();
  const submit = () => trimmed && onSubmit(trimmed);

  return (
    <Dialog visible title={title} onClose={onClose}>
      <TextInput
        value={value}
        onChangeText={setValue}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        autoFocus
        selectTextOnFocus
        onSubmitEditing={submit}
        returnKeyType="done"
        style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]}
      />
      <View style={styles.actions}>
        <Button label="Bekor qilish" variant="secondary" onPress={onClose} style={styles.action} />
        <Button label={submitLabel} disabled={!trimmed} onPress={submit} style={styles.action} />
      </View>
    </Dialog>
  );
}

type ChoiceProps<T> = {
  visible: boolean;
  title: string;
  options: { value: T; label: string }[];
  selected: T;
  onSelect: (value: T) => void;
  onClose: () => void;
};

export function ChoiceDialog<T>({ visible, title, options, selected, onSelect, onClose }: ChoiceProps<T>) {
  const colors = useColors();
  return (
    <Dialog visible={visible} title={title} onClose={onClose}>
      <ScrollView style={styles.list}>
        {options.map((o) => (
          <Pressable
            key={String(o.value)}
            onPress={() => onSelect(o.value)}
            style={({ pressed }) => [styles.option, pressed && { backgroundColor: colors.surface }]}>
            <AppText variant="bodyMedium" style={styles.flex}>
              {o.label}
            </AppText>
            {o.value === selected && <Check size={20} color={colors.text} />}
          </Pressable>
        ))}
      </ScrollView>
      <Button label="Bekor qilish" variant="secondary" onPress={onClose} />
    </Dialog>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.xl,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  card: {
    gap: Spacing.lg,
    padding: Spacing.xl,
    borderRadius: Radius.lg,
  },
  input: {
    height: 48,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.md,
    fontFamily: Fonts.regular,
    fontSize: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  action: {
    flex: 1,
    paddingHorizontal: Spacing.sm,
  },
  list: {
    maxHeight: 320,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
  },
  flex: {
    flex: 1,
  },
});
