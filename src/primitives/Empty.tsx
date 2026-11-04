import React from "react";
import { cn } from "../utils/cn";

export interface EmptyProps {
  description?: React.ReactNode;
  image?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

/** 轻量 Empty 原语（库内置）。 */
export function Empty({ description, image, className, style }: EmptyProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-muted-foreground py-12",
        className,
      )}
      style={style}
    >
      {image && <div className="mb-4 text-muted-foreground/50">{image}</div>}
      {description && <p className="text-center text-sm">{description}</p>}
    </div>
  );
}
