import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Txt } from '../../ui';
import { C, radius } from '../../theme/tokens';

/**
 * Free-text tag entry: type a value and submit (or comma) to add a chip; tap a
 * chip to remove it. Used for the free-text city/country lists (operating /
 * supplying areas) collected at sign-up and in the loader crew form.
 */
export function TagInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState('');

  const add = (raw: string) => {
    const v = raw.trim().replace(/,$/, '').trim();
    setDraft('');
    if (!v) return;
    if (value.some((tag) => tag.toLowerCase() === v.toLowerCase())) return;
    onChange([...value, v]);
  };

  return (
    <View style={{ gap: 6 }}>
      <Txt variant="label">{label}</Txt>
      {value.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {value.map((tag, i) => (
            <Pressable
              key={`${tag}-${i}`}
              onPress={() => onChange(value.filter((_, idx) => idx !== i))}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                backgroundColor: C.mint,
                borderRadius: 999,
                paddingVertical: 4,
                paddingHorizontal: 10,
              }}
            >
              <Txt style={{ color: C.dark, fontSize: 13, fontWeight: '700' }}>{tag}</Txt>
              <Ionicons name="close" size={13} color={C.dark} />
            </Pressable>
          ))}
        </View>
      )}
      <TextInput
        value={draft}
        onChangeText={(txt) => (txt.endsWith(',') ? add(txt) : setDraft(txt))}
        onSubmitEditing={() => add(draft)}
        onBlur={() => add(draft)}
        blurOnSubmit={false}
        placeholder={placeholder}
        placeholderTextColor={C.inkSoft}
        style={{
          borderWidth: 1,
          borderColor: C.border,
          borderRadius: radius.md,
          paddingHorizontal: 12,
          paddingVertical: 10,
          fontSize: 15,
          color: C.ink,
          backgroundColor: C.white,
        }}
      />
    </View>
  );
}
