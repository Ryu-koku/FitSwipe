import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { feedback, useTheme } from '../ui';
import { SwipeDeleteRow } from './SwipeDeleteRow';

export function ExerciseManagementItem({ name, onEdit, onDelete }: {
  name: string; onEdit: () => void; onDelete: () => void;
}) {
  const { colors, styles } = useTheme();
  const [open, setOpen] = useState(false);
  return <View style={{ marginTop: 12 }}>
    <SwipeDeleteRow name={name} open={open} onOpenChange={setOpen} onDelete={onDelete}>
      {(closeOnTap) => <Pressable accessibilityRole="button" accessibilityLabel={`${name}を編集`}
        accessibilityActions={[{ name: 'activate', label: '編集' }, { name: 'delete', label: '削除' }]}
        onAccessibilityAction={(event) => { feedback();
          if (event.nativeEvent.actionName === 'delete') onDelete();
          else if (event.nativeEvent.actionName === 'activate') onEdit();
        }}
        onPress={() => { feedback(); if (!closeOnTap()) onEdit(); }}
        style={{ height: 62, justifyContent: 'center', paddingHorizontal: 18, backgroundColor: colors.surface,
          borderRadius: 20, borderTopRightRadius: 0, borderBottomRightRadius: 0, borderWidth: 1, borderColor: colors.line }}>
        <Text style={[styles.body, { fontWeight: '600' }]}>{name}</Text>
      </Pressable>}
    </SwipeDeleteRow>
  </View>;
}
