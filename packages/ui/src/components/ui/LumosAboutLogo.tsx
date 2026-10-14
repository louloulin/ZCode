import { LumosMark } from "@/components/brand/LumosMark.js";
import { cn } from "@/components/lib/utils.js";

/**
 * 品牌标识组件。
 *
 * 注意：这两个组件此前内联的是**厂商的图形**——
 *   - LumosAboutLogo  用的是 Z.ai 商标路径
 *   - LumosWordmarkLogo 用的是把 "ZCode" 字形做成矢量路径的文字标
 * 两者都是"图形里的旧品牌"，纯文本改名扫不到，因此在此统一改由
 * `LumosMark` 提供几何，组件本身只负责排版。
 */
export function LumosAboutLogo({ className }: { className?: string }) {
  return <LumosMark className={cn("h-auto w-10", className)} />;
}

export function LumosWordmarkLogo({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="244"
      height="54"
      viewBox="0 0 244 54"
      fill="none"
      className={cn("shrink-0 text-current", className)}
      aria-hidden="true"
      focusable="false"
    >
      {/* 标记 */}
      <rect
        x="2"
        y="2"
        width="50"
        height="50"
        rx="13"
        fill="none"
        stroke="currentColor"
        strokeWidth="5"
      />
      <rect x="18" y="14" width="7" height="26" rx="3.5" fill="currentColor" />
      <rect x="18" y="33" width="21" height="7" rx="3.5" fill="currentColor" />
      {/* 文字：使用系统无衬线，避免内嵌字体文件，三端（Electron/浏览器/移动 WebView）一致 */}
      <text
        x="66"
        y="36"
        fill="currentColor"
        fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
        fontSize="30"
        fontWeight="600"
        letterSpacing="0.4"
      >
        Lumos
      </text>
    </svg>
  );
}
