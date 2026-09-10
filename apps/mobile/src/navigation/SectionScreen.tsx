import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from './types';
import { getSection } from '../screens/registry';
import { Placeholder } from '../screens/Placeholder';

type Props = NativeStackScreenProps<RootStackParamList, 'Section'>;

export function SectionScreen({ route }: Props) {
  const { role, section, title } = route.params;
  const Comp = getSection(role, section);
  // A deep link carries no label; the section id is a better last resort than blank.
  return Comp ? <Comp /> : <Placeholder title={title ?? section} />;
}
