import { useState } from 'react';
import { Button, Icon } from '@agrotraders/ui';
import { api } from '../../lib/api';

/**
 * Download the caller's wallet statement as a PDF or CSV. The API mints a
 * short-lived signed URL (the token rides in the query string), which we open
 * in a new tab; the server's `Content-Disposition: attachment` makes the
 * browser save it.
 */
export function StatementButtons() {
  const [busy, setBusy] = useState<'pdf' | 'csv' | null>(null);

  async function download(kind: 'pdf' | 'csv') {
    setBusy(kind);
    try {
      const url = await api.me.statementUrl(kind);
      window.open(url, '_blank', 'noopener');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => download('pdf')} leftIcon={<Icon name="file" size={14} />}>
        {busy === 'pdf' ? '…' : 'PDF'}
      </Button>
      <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => download('csv')} leftIcon={<Icon name="file" size={14} />}>
        {busy === 'csv' ? '…' : 'CSV'}
      </Button>
    </div>
  );
}
