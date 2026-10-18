import { describe, expect, it } from 'vitest';
import { translate } from '../../src/i18n';
import spanish from '../../src/i18n/es.json';
import { validSettings } from '../../src/storage/database';
import { defaults } from '../../src/domain/model';
describe('interface localization', () => {
  it('translates UI phrases while retaining deliberate surrounding spacing', () => { expect(translate(' Save highlight ', 'es')).toBe(' Guardar subrayado '); expect(translate('Settings', 'en')).toBe('Settings'); });
  it('interpolates user content without translating it', () => { expect(translate('Read {0}', 'es', ['Settings'])).toBe('Leer Settings'); expect(translate('Read {0}', 'en', ['Mi diario'])).toBe('Read Mi diario'); });
  it('accepts legacy backups without language and validates new preferences', () => { const legacy = { ...defaults }; delete legacy.uiLanguage; expect(validSettings(legacy)).toBe(true); expect(validSettings({ ...defaults, uiLanguage: 'es' })).toBe(true); expect(validSettings({ ...defaults, uiLanguage: 'xx' } as unknown as typeof defaults)).toBe(false); });
  it('keeps all catalog entries nonempty and preserves interpolation slots', () => { for (const [key, value] of Object.entries(spanish)) { expect(value.trim(), key).not.toBe(''); expect(value.match(/\{\d+\}/g)?.sort() || [], key).toEqual(key.match(/\{\d+\}/g)?.sort() || []); } });
});
