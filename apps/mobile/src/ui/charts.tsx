import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';
import { C, radius } from '../theme/tokens';
import { Card } from './index';
import { MotiView, useReduceMotion } from './motion';
import { useI18n } from '../i18n';

const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Localized short month name; falls back to English if ICU data is unavailable. */
function monthLabel(d: Date, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, { month: 'short' }).format(d);
  } catch {
    return MONTHS_EN[d.getMonth()];
  }
}

function lastMonths(n: number, locale: string): string[] {
  const now = new Date();
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) out.push(monthLabel(new Date(now.getFullYear(), now.getMonth() - i, 1), locale));
  return out;
}

/** Column chart with an 8M / 1Y range toggle. Last bar is mango. */
export function BarChart({ title, caption, data8 = [], data12 = [] }: { title: string; caption: string; data8?: number[]; data12?: number[] }) {
  const { t, lang } = useI18n();
  const [range, setRange] = useState<'8M' | '1Y'>('8M');
  const reduce = useReduceMotion();
  const raw = range === '8M' ? data8 : data12;
  const len = range === '8M' ? 8 : 12;
  const filled = raw.length ? raw : new Array(len).fill(0);
  const max = Math.max(1, ...filled);
  // Normalize to 0–100 bar heights so any absolute values fit the container.
  const series = filled.map((v) => Math.round((v / max) * 100));
  const hasData = filled.some((v) => v > 0);
  const labels = lastMonths(series.length, lang);
  return (
    <Card>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View>
          <Text style={{ fontSize: 17, fontWeight: '700', color: C.ink }}>{title}</Text>
          <Text style={{ fontSize: 12, color: C.inkSoft, marginTop: 2 }}>{caption} · {t('compX.chart.lastMonths', { count: series.length })}</Text>
        </View>
        <View style={{ flexDirection: 'row', backgroundColor: C.bg, borderRadius: radius.md, padding: 3 }}>
          {(['8M', '1Y'] as const).map((r) => (
            <Pressable key={r} onPress={() => setRange(r)} style={{ paddingHorizontal: 12, paddingVertical: 5, borderRadius: radius.sm, backgroundColor: range === r ? C.evergreen : 'transparent' }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: range === r ? C.white : C.inkSoft }}>{r}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      {hasData ? (
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 150, gap: 6, marginTop: 18 }}>
          {series.map((v, i) => (
            <View key={i} style={{ flex: 1, justifyContent: 'flex-end', alignSelf: 'stretch' }}>
              <MotiView
                from={{ height: reduce ? (`${Math.max(2, v)}%` as const) : ('0%' as const) }}
                animate={{ height: `${Math.max(2, v)}%` as const }}
                transition={{ type: 'timing', duration: 600, delay: i * 40 }}
                style={{ backgroundColor: i === series.length - 1 ? C.mango : C.green, borderTopLeftRadius: 6, borderTopRightRadius: 6 }}
              />
            </View>
          ))}
        </View>
      ) : (
        <View style={{ height: 150, marginTop: 18, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 13, color: C.inkSoft }}>{t('compX.chart.noData')}</Text>
        </View>
      )}
      <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
        {labels.map((m, i) => (
          <Text key={i} style={{ flex: 1, textAlign: 'center', fontSize: 11, color: C.inkSoft }}>{t('compX.chart.month.' + m, { defaultValue: m })}</Text>
        ))}
      </View>
    </Card>
  );
}

/** Two-segment donut (buyers green / sellers mango) with a center total. */
export function Donut({ buyers, sellers, total }: { buyers: number; sellers: number; total: string }) {
  const { t } = useI18n();
  const sum = Math.max(1, buyers + sellers);
  const fb = buyers / sum;
  const fs = sellers / sum;
  const r = 42;
  const c = 2 * Math.PI * r;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
      <Svg width={112} height={112} viewBox="0 0 120 120">
        <Circle cx={60} cy={60} r={r} fill="none" stroke={C.surface} strokeWidth={14} />
        <Circle cx={60} cy={60} r={r} fill="none" stroke={C.green} strokeWidth={14} strokeDasharray={`${fb * c} ${c}`} rotation={-90} origin="60, 60" />
        <Circle cx={60} cy={60} r={r} fill="none" stroke={C.mangoDeep} strokeWidth={14} strokeDasharray={`${fs * c} ${c}`} strokeDashoffset={-fb * c} rotation={-90} origin="60, 60" />
        <SvgText x={60} y={66} textAnchor="middle" fontSize={20} fontWeight="800" fill={C.ink}>{total}</SvgText>
      </Svg>
      <View style={{ flex: 1, gap: 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: C.green }} />
            <Text style={{ fontSize: 14, color: C.ink }}>{t('compX.chart.buyers')}</Text>
          </View>
          <Text style={{ fontSize: 14, fontWeight: '700', color: C.ink }}>{Math.round(fb * 100)}%</Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: C.mangoDeep }} />
            <Text style={{ fontSize: 14, color: C.ink }}>{t('compX.chart.sellers')}</Text>
          </View>
          <Text style={{ fontSize: 14, fontWeight: '700', color: C.ink }}>{Math.round(fs * 100)}%</Text>
        </View>
      </View>
    </View>
  );
}
