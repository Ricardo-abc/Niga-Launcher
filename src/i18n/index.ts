import { I18n } from 'i18n-js';
import * as Localization from 'expo-localization';
import zh from './zh.json';
import en from './en.json';

const i18n = new I18n({ zh, en });

i18n.enableFallback = true;
i18n.defaultLocale = 'zh';

const deviceLocale = Localization.locale;
i18n.locale = deviceLocale.startsWith('zh') ? 'zh' : 'en';

export default i18n;
export const t = (key: string, options?: object) => i18n.t(key, options);
export const locale = i18n.locale;
