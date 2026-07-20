import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from './types';
import { getSection } from '../screens/registry';
import { Placeholder } from '../screens/Placeholder';

type Props = NativeStackScreenProps<RootStackParamList, 'Section'>;

export function SectionScreen({ route }: Props) {
  const { role, section, title } = route.params;
  const Comp = getSection(role, section);
  return Comp ? <Comp /> : <Placeholder title={title} />;
}
