import React, {
  CSSProperties,
  ElementType,
  ReactNode,
  ComponentPropsWithoutRef,
} from "react";
import clsx from "clsx";

type BoundedProps<C extends ElementType = "section"> = {
  as?: C;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
} & Omit<ComponentPropsWithoutRef<C>, "className" | "style" | "children">;

export function Bounded<C extends ElementType = "section">({
  as: Comp = "section" as C,
  className,
  children,
  style,
  ...restProps
}: BoundedProps<C>) {
  return (
    <Comp
      className={clsx(
        "px-6 ~py-10/16 [.header+&]:pt-44 [.header+&]:md:pt-32",
        className
      )}
      style={style}
      {...(restProps as any)}
    >
      <div className="mx-auto w-full max-w-6xl">{children}</div>
    </Comp>
  );
}
