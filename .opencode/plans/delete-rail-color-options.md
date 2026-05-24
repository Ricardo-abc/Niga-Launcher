# 删除字母轨道颜色选项

## 目标
从设置面板的"轨道"模块中删除两个颜色选择器：
- "轨道字母颜色"
- "滑动中字母颜色"

## 需要修改的文件

### 1. `src/components/settings/modules.tsx`
- 删除第 77-82 行的 `SettingColor` 组件（轨道字母颜色）
- 删除第 83-88 行的 `SettingColor` 组件（滑动中字母颜色）
- 清理未使用的导入：`RAIL_COLORS`, `RAIL_ACTIVE_COLORS`

### 2. 可选清理（不影响功能）
- `src/constants/defaultSettings.ts` 中的 `RAIL_COLORS` 和 `RAIL_ACTIVE_COLORS` 常量可保留（不影响功能）
- `src/types/settings.ts` 中的 `railColor` 和 `railActiveColor` 字段可保留（其他地方可能用到）

## 验证
修改后运行 `npm run lint` 或 `npm run typecheck` 确保没有类型错误。
