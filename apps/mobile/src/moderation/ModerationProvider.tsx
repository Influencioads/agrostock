import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import type { ApiReportTargetType } from '@agrotraders/api-client';
import { api } from '../lib/api';
import { useAuth } from '../auth/AuthProvider';
import { Button, Input, Sheet, Txt } from '../ui';
import { C, space } from '../theme/tokens';
import { useI18n } from '../i18n';
import { errMessage } from '../lib/format';

/**
 * Report & block, app-wide (App Store Guideline 1.2: an app carrying
 * user-generated content must let people flag objectionable content and block
 * abusive users).
 *
 * It lives in a provider rather than in each screen because the affordance has
 * to appear on posts, chat messages, DMs, listings and profiles — five surfaces
 * that share no common ancestor — and every one of them needs the same sheet,
 * the same reasons and the same post-submit behaviour.
 */

/** What the viewer is acting on. `authorId` enables "block" alongside "report". */
export type ModerationTarget = {
  type: ApiReportTargetType;
  id: string;
  /** The account behind the content, when it is not the target itself. */
  authorId?: string;
  authorName?: string;
};

type Ctx = {
  /** Opens the report sheet for a piece of content or a user. */
  promptReport: (target: ModerationTarget) => void;
  /** Confirms, then blocks — hides their content and stops DMs both ways. */
  promptBlock: (userId: string, name?: string) => void;
};

const ModerationCtx = createContext<Ctx | null>(null);

/** Reason codes offered in the sheet; the label comes from `moderation.reason.*`. */
const REASONS = ['spam', 'scam', 'offensive', 'harassment', 'illegal', 'other'] as const;

export function ModerationProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [target, setTarget] = useState<ModerationTarget | null>(null);
  const [reason, setReason] = useState<string>('');
  const [detail, setDetail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const close = useCallback(() => {
    setTarget(null);
    setReason('');
    setDetail('');
    setError('');
  }, []);

  const promptReport = useCallback(
    (next: ModerationTarget) => {
      // Guests see the affordance (see ModerationButton) but the endpoint is
      // authenticated, so without this the sheet opened and submit died on a 401.
      if (!user) {
        Alert.alert(t('moderation.signInTitle'), t('moderation.signInBody'));
        return;
      }
      setReason('');
      setDetail('');
      setError('');
      setTarget(next);
    },
    [user, t],
  );

  const doBlock = useCallback(
    async (userId: string) => {
      await api.community.block(userId);
      // Blocked authors drop out of the feed, group rooms, DM list and search on
      // the server, so every cached list has to be refetched rather than patched.
      //
      // A prefix key does NOT work here: React Query compares key elements one by
      // one, and the community caches are keyed ['community-feed', lang] /
      // ['community-groups', lang] / ['community-my', lang] — 'community' is not
      // equal to 'community-feed', so `queryKey: ['community']` matched nothing and
      // the blocked author stayed on screen until the app was restarted. Match on
      // the key's first segment instead, which covers every current community cache
      // and any later one that follows the same naming.
      await qc.invalidateQueries({
        predicate: (q) => {
          const head = q.queryKey[0];
          return typeof head === 'string' && (head.startsWith('community') || head === 'products' || head === 'public-profile');
        },
      });
    },
    [qc],
  );

  const promptBlock = useCallback(
    (userId: string, name?: string) => {
      if (!user) {
        Alert.alert(t('moderation.signInTitle'), t('moderation.signInBody'));
        return;
      }
      Alert.alert(
        t('moderation.blockTitle', { name: name ?? t('moderation.thisUser') }),
        t('moderation.blockBody'),
        [
          { text: t('common:cancel'), style: 'cancel' },
          {
            text: t('moderation.blockCta'),
            style: 'destructive',
            onPress: async () => {
              try {
                await doBlock(userId);
                Alert.alert(t('moderation.blockedTitle'), t('moderation.blockedBody'));
              } catch (e) {
                Alert.alert(t('moderation.failedTitle'), errMessage(e, t('moderation.blockFailed')));
              }
            },
          },
        ],
      );
    },
    [user, t, doBlock],
  );

  const submit = useCallback(async () => {
    if (!target || !reason) return;
    setBusy(true);
    setError('');
    try {
      // The free-text note is appended to the code so moderators see both in the
      // single `reason` column the report table carries.
      const note = detail.trim();
      await api.community.report({
        targetType: target.type,
        targetId: target.id,
        reason: note ? `${reason}: ${note}` : reason,
      });
      const author = target.authorId ?? (target.type === 'user' ? target.id : undefined);
      close();
      // Offer the block as the natural follow-up — Apple expects both to be
      // reachable, and someone reporting content usually wants to stop seeing it.
      if (author && author !== user?.id) {
        Alert.alert(t('moderation.thanksTitle'), t('moderation.thanksBody'), [
          { text: t('moderation.notNow'), style: 'cancel' },
          {
            text: t('moderation.alsoBlock'),
            style: 'destructive',
            onPress: () => {
              void doBlock(author).catch(() => undefined);
            },
          },
        ]);
      } else {
        Alert.alert(t('moderation.thanksTitle'), t('moderation.thanksBody'));
      }
    } catch (e) {
      setError(errMessage(e, t('moderation.reportFailed')));
    } finally {
      setBusy(false);
    }
  }, [target, reason, detail, close, t, user, doBlock]);

  const value = useMemo<Ctx>(() => ({ promptReport, promptBlock }), [promptReport, promptBlock]);

  return (
    <ModerationCtx.Provider value={value}>
      {children}
      <Sheet
        visible={!!target}
        onClose={close}
        title={t(target?.type === 'user' ? 'moderation.reportUserTitle' : 'moderation.reportTitle')}
        footer={
          <Button
            title={t('moderation.submit')}
            full
            variant="danger"
            disabled={!reason || busy}
            loading={busy}
            onPress={submit}
          />
        }
      >
        <Txt variant="small" color={C.inkSoft}>{t('moderation.reportBody')}</Txt>
        <View style={s.reasons}>
          {REASONS.map((r) => (
            <Button
              key={r}
              title={t(`moderation.reason.${r}`)}
              size="sm"
              full
              variant={reason === r ? 'primary' : 'outline'}
              onPress={() => setReason(r)}
            />
          ))}
        </View>
        <Input
          label={t('moderation.detailLabel')}
          placeholder={t('moderation.detailPlaceholder')}
          value={detail}
          onChangeText={setDetail}
          multiline
          numberOfLines={3}
          maxLength={500}
        />
        {error ? <Txt variant="small" color={C.error}>{error}</Txt> : null}
      </Sheet>
    </ModerationCtx.Provider>
  );
}

/**
 * Long-press actions for a chat message: report, and block the sender.
 *
 * Chat bubbles carry no visible "⋯", so long-press is the only entry point — and
 * wiring it straight to `promptReport` left group rooms and DMs with no way to
 * block anyone, which is half of what Guideline 1.2 asks for.
 */
export function useMessageActions() {
  const { t } = useI18n();
  const { promptReport, promptBlock } = useModeration();
  return (target: ModerationTarget) => {
    const author = target.authorId;
    const options: Parameters<typeof Alert.alert>[2] = [
      { text: t('moderation.reportAction'), style: 'destructive', onPress: () => promptReport(target) },
    ];
    if (author) {
      options.push({
        text: t('moderation.blockAction'),
        style: 'destructive',
        onPress: () => promptBlock(author, target.authorName),
      });
    }
    options.push({ text: t('common:cancel'), style: 'cancel' });
    Alert.alert(t('moderation.menuTitle'), undefined, options);
  };
}

export function useModeration(): Ctx {
  const ctx = useContext(ModerationCtx);
  if (!ctx) throw new Error('useModeration must be used inside <ModerationProvider>');
  return ctx;
}

const s = StyleSheet.create({
  reasons: { gap: space.sm, marginVertical: space.md },
});
