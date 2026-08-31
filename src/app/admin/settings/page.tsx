import { requireAdminPage } from '@/lib/admin';
import { getSettings } from '@/lib/settings';
import { SettingsForm } from '@/components/admin/settings-form';

export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage() {
  await requireAdminPage();
  const settings = await getSettings();
  return (
    <div className="max-w-2xl">
      <h2 className="font-display text-display-sm font-semibold text-ink">
        Predictor settings
      </h2>
      <p className="mt-1 text-sm text-ink-muted">
        These take effect immediately for everyone. No deploy is needed.
      </p>
      <div className="mt-6">
        <SettingsForm settings={settings} />
      </div>
    </div>
  );
}
