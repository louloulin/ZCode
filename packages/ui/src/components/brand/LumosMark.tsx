import { cn } from "@/components/lib/utils.js";

/**
 * Lumos 品牌标记（单色，随 currentColor 走）。
 *
 * 这是**唯一**一份 Lumos 标记的几何定义：
 *   - 圆角方框 + 字母 L（两条圆角矩形），在 20px 小尺寸下仍可辨识
 *   - 使用 currentColor，因此暗/亮主题自动适配，不需要多套素材
 *
 * 历史背景：此处原先内联的是 Z.ai 的商标路径（`d="M134.4 0.130152…"`），
 * 以及一份把 "ZCode" 字形做成矢量路径的文字标（因此纯文本改名扫不到它）。
 * 现在统一替换为本标记，避免同一品牌在多个组件里各画一份、日后漂移。
 */
export function LumosMark({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      fill="none"
      className={cn("shrink-0 text-current", className)}
      aria-hidden="true"
      focusable="false"
    >
      {/* 圆角方框 */}
      <rect
        x="3"
        y="3"
        width="58"
        height="58"
        rx="15"
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
      />
      {/* 字母 L：竖笔 + 横笔 */}
      <rect x="21" y="17" width="8" height="30" rx="4" fill="currentColor" />
      <rect x="21" y="39" width="24" height="8" rx="4" fill="currentColor" />
    </svg>
  );
}
