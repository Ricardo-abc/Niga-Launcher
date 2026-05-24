import { useMemo } from 'react';
import { useSettingsContext } from '../context/SettingsContext';
import { ALPHABET } from '../constants/defaultSettings';
import { AppInfo } from '../types/settings';

/**
 * 根据设置返回当前活跃的字母列表
 * - appList 模式：隐藏 *
 * - favoritesTop 模式：显示 *
 */
export function useActiveAlphabet(): string[] {
  const { settings } = useSettingsContext();

  return useMemo(() => {
    if (settings.letterScrollTarget === 'appList') {
      return ALPHABET.filter(letter => letter !== '*');
    }
    return ALPHABET;
  }, [settings.letterScrollTarget]);
}

/**
 * 根据 emptyLetterMode 返回轨道字母列表
 * - hide: 过滤掉没有应用的字母
 * - dim: 返回全量字母（由渲染层控制透明度）
 */
export function useRailAlphabet(apps: AppInfo[]): {
  alphabet: string[];
  hasAppSet: Set<string>;
} {
  const { settings } = useSettingsContext();
  const baseAlphabet = useActiveAlphabet();

  return useMemo(() => {
    const appLetters = new Set(apps.map(a => a.letter));

    if (settings.emptyLetterMode === 'hide') {
      const filtered = baseAlphabet.filter(l => l === '#' || l === '*' || appLetters.has(l));
      return { alphabet: filtered, hasAppSet: appLetters };
    }

    return { alphabet: baseAlphabet, hasAppSet: appLetters };
  }, [baseAlphabet, apps, settings.emptyLetterMode]);
}

export default useActiveAlphabet;
