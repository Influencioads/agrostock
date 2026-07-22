import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Txt } from '../../ui';
import { C, radius } from '../../theme/tokens';
import { PickerSheet, type PickerOption } from './PickerSheet';

/**
 * Tag entry: type a value and submit (or comma) to add a chip; tap a chip to
 * remove it. Used for the city/country lists (operating / supplying areas)
 * collected at sign-up and in the loader crew form.
 *
 * Pass `options` to add a "choose from list" sheet — entries then snap to the
 * canonical spelling, which is what makes the directory filters match. Free text
 * still works on purpose: a missing place must never block a signup.
 */
export function TagInput({
  label,
  value,
  onChange,
  placeholder,
  options,
  onSearch,
  loading,
  pickLabel,
}: {
  label: string;
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  /** Suggestions. Already filtered when they come from a server-side search. */
  options?: PickerOption[];
  onSearch?: (q: string) => void;
  loading?: boolean;
  pickLabel?: string;
}) {
  const [draft, setDraft] = useState('');
  const [picking, setPicking] = useState(false);

  const add = (raw: string) => {
    const v = raw.trim().replace(/,$/, '').trim();
    setDraft('');
    if (!v) return;
    // Snap to the canonical option when one matches, so casing/spelling is stable.
    const canonical = options?.find((o) => o.value.toLowerCase() === v.toLowerCase())?.value ?? v;
    if (value.some((tag) => tag.toLowerCase() === canonical.toLowerCase())) return;
    onChange([...value, canonical]);
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
      {options && (
        <>
          <Pressable onPress={() => setPicking(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="add-circle-outline" size={15} color={C.green} />
            <Txt variant="small" style={{ color: C.green, fontWeight: '700' }}>
              {pickLabel ?? label}
            </Txt>
          </Pressable>
          <PickerSheet
            visible={picking}
            title={label}
            options={options.filter((o) => !value.some((v) => v.toLowerCase() === o.value.toLowerCase()))}
            onSelect={add}
            onClose={() => setPicking(false)}
            onSearch={onSearch}
            loading={loading}
          />
        </>
      )}
    </View>
  );
}
