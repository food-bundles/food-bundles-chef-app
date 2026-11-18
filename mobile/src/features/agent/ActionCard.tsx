import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CheckCircle2, CircleAlert, XCircle } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { AppButton } from '@/components/ui/AppButton';
import { SelectableChip } from '@/components/ui/SelectableChip';
import { ThemedTextInput } from '@/components/ui/ThemedTextInput';
import { fontSize, fontWeight, radius, spacing } from '@/lib/theme';
import { useTheme } from '@/providers/ThemeProvider';
import type { ActionProposal } from '@/api/agent-api';
import type { ChatEntry } from './chat-types';
import {
  applyEdits,
  editableFields,
  fieldValue,
  proposalDetails,
  proposalTitle,
  validateField,
  type EditableField,
} from './proposal-view';

type ProposalEntry = Extract<ChatEntry, { type: 'proposal' }>;

export interface ActionCardProps {
  entry: ProposalEntry;
  confirming: boolean;
  /** Another card is being confirmed — keep this one inert until it finishes. */
  busy: boolean;
  onConfirm: (entry: ProposalEntry) => void;
  onCancel: (entry: ProposalEntry) => void;
  onEdit: (entry: ProposalEntry, proposal: ActionProposal) => void;
}

/**
 * "Record 12 × Chips sold? — Confirm / Edit / Cancel". Nothing is written until
 * Confirm; the card lists exactly the values that will be written.
 */
export function ActionCard({ entry, confirming, busy, onConfirm, onCancel, onEdit }: ActionCardProps) {
  const { t, i18n } = useTranslation();
  const tokens = useTheme();
  const lang = i18n.language;
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [showErrors, setShowErrors] = useState(false);

  const title = proposalTitle(entry.proposal, t, lang);
  const details = proposalDetails(entry.proposal, t, lang);
  const fields = useMemo(() => editableFields(entry.proposal, t), [entry.proposal, t]);

  const errors = useMemo(() => {
    const map: Record<string, string> = {};
    for (const field of fields) {
      const error = validateField(field, values[field.id] ?? fieldValue(entry.proposal, field));
      if (error) map[field.id] = error;
    }
    return map;
  }, [fields, values, entry.proposal]);

  const startEdit = () => {
    setValues(Object.fromEntries(fields.map((f) => [f.id, fieldValue(entry.proposal, f)])));
    setShowErrors(false);
    setEditing(true);
  };

  const saveEdit = () => {
    setShowErrors(true);
    if (Object.keys(errors).length > 0) return;
    onEdit(entry, applyEdits(entry.proposal, fields, values));
    setEditing(false);
  };

  const pending = entry.status === 'pending' || entry.status === 'failed';

  return (
    <View
      style={[styles.card, { backgroundColor: tokens.surfaceRaised, borderColor: tokens.border }]}
      accessibilityLabel={t('agent.card.a11y', { title })}
    >
      <Text style={[styles.kicker, { color: tokens.textMuted }]}>
        {entry.edited ? t('agent.card.kickerEdited') : t('agent.card.kicker')}
      </Text>
      <Text style={[styles.title, { color: tokens.text }]} accessibilityRole="header">
        {title}
      </Text>

      {!editing && details.length > 0 && (
        <View style={[styles.details, { backgroundColor: tokens.surfaceSunken }]}>
          {details.map((d, i) => (
            <View key={`${d.label}-${i}`} style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: tokens.textMuted }]} numberOfLines={2}>
                {d.label}
              </Text>
              <Text style={[styles.detailValue, { color: tokens.text }]}>{d.value}</Text>
            </View>
          ))}
        </View>
      )}

      {editing && (
        <View style={styles.form}>
          {fields.map((field) => (
            <FieldEditor
              key={field.id}
              field={field}
              value={values[field.id] ?? ''}
              error={showErrors ? errors[field.id] : undefined}
              onChange={(v) => setValues((prev) => ({ ...prev, [field.id]: v }))}
            />
          ))}
        </View>
      )}

      {entry.status === 'confirmed' && (
        <View style={styles.statusRow} accessibilityLiveRegion="polite">
          <CheckCircle2 size={16} color={tokens.primary} />
          <Text style={[styles.statusText, { color: tokens.text }]}>{t('agent.card.done')}</Text>
        </View>
      )}
      {entry.status === 'cancelled' && (
        <View style={styles.statusRow}>
          <XCircle size={16} color={tokens.textMuted} />
          <Text style={[styles.statusText, { color: tokens.textMuted }]}>{t('agent.card.cancelled')}</Text>
        </View>
      )}
      {entry.status === 'failed' && (
        <View style={[styles.statusRow, styles.failedRow, { backgroundColor: tokens.dangerTint }]} accessibilityLiveRegion="polite">
          <CircleAlert size={16} color={tokens.danger} />
          <Text style={[styles.statusText, { color: tokens.danger }]}>{t(entry.errorKey ?? 'agent.card.failed')}</Text>
        </View>
      )}

      {pending && !editing && (
        <View style={styles.actions}>
          <View style={styles.actionCell}>
            <AppButton
              label={t('agent.card.cancel')}
              variant="ghost"
              onPress={() => onCancel(entry)}
              disabled={confirming || busy}
              accessibilityLabel={t('agent.card.cancelA11y', { title })}
            />
          </View>
          {fields.length > 0 && (
            <View style={styles.actionCell}>
              <AppButton
                label={t('agent.card.edit')}
                variant="secondary"
                onPress={startEdit}
                disabled={confirming || busy}
                accessibilityLabel={t('agent.card.editA11y', { title })}
              />
            </View>
          )}
          <View style={styles.actionCell}>
            <AppButton
              label={entry.status === 'failed' ? t('agent.card.retry') : t('agent.card.confirm')}
              variant="action"
              onPress={() => onConfirm(entry)}
              loading={confirming}
              disabled={busy && !confirming}
              accessibilityLabel={t('agent.card.confirmA11y', { title })}
            />
          </View>
        </View>
      )}

      {editing && (
        <View style={styles.actions}>
          <View style={styles.actionCell}>
            <AppButton label={t('agent.card.discardEdit')} variant="ghost" onPress={() => setEditing(false)} />
          </View>
          <View style={styles.actionCell}>
            <AppButton label={t('agent.card.saveEdit')} variant="action" onPress={saveEdit} />
          </View>
        </View>
      )}
    </View>
  );
}

function FieldEditor({
  field,
  value,
  error,
  onChange,
}: {
  field: EditableField;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  const { t } = useTranslation();
  const tokens = useTheme();

  if (field.kind === 'choice') {
    return (
      <View style={styles.field}>
        <Text style={[styles.fieldLabel, { color: tokens.text }]}>{field.label}</Text>
        <View style={styles.chips}>
          {field.options?.map((o) => (
            <SelectableChip key={o.value} label={o.label} selected={value === o.value} onPress={() => onChange(o.value)} />
          ))}
        </View>
      </View>
    );
  }

  const numeric = field.kind === 'int' || field.kind === 'decimal';
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: tokens.text }]}>{field.label}</Text>
      <View style={styles.inputRow}>
        <ThemedTextInput
          value={value}
          onChangeText={onChange}
          keyboardType={field.kind === 'int' ? 'number-pad' : field.kind === 'decimal' ? 'decimal-pad' : 'default'}
          accessibilityLabel={field.label}
          style={[
            styles.input,
            {
              color: tokens.text,
              backgroundColor: tokens.surface,
              borderColor: error ? tokens.danger : tokens.border,
            },
            numeric && styles.inputNumeric,
          ]}
        />
        {field.unit ? <Text style={[styles.unit, { color: tokens.textMuted }]}>{field.unit}</Text> : null}
      </View>
      {error ? (
        <Text style={[styles.error, { color: tokens.danger }]} accessibilityLiveRegion="polite">
          {t(error, { min: field.min ?? 0 })}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.sm,
  },
  kicker: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    lineHeight: 24,
  },
  details: {
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  detailLabel: {
    fontSize: fontSize.sm,
    flexShrink: 1,
  },
  detailValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    textAlign: 'right',
    flexShrink: 1,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  failedRow: {
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  statusText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    flexShrink: 1,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  actionCell: {
    flexGrow: 1,
    flexBasis: 90,
  },
  form: {
    gap: spacing.md,
  },
  field: {
    gap: spacing.xs,
  },
  fieldLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.base,
  },
  inputNumeric: {
    fontVariant: ['tabular-nums'],
  },
  unit: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  error: {
    fontSize: fontSize.sm,
  },
});
