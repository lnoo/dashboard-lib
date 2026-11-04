import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Tailwind 类名合并工具（clsx + tailwind-merge），与主流 shadcn 项目一致的语义。 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
