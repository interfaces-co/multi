import { useLayoutEffect, useRef } from "react";
import { createSignal, type Accessor, type JSX as SolidJSX, type Setter } from "solid-js";
import { render } from "solid-js/web";

export interface SolidIslandProps<TProps extends object> {
  className?: string;
  component: (props: Accessor<TProps>) => SolidJSX.Element;
  props: TProps;
}

export function SolidIsland<TProps extends object>(props: SolidIslandProps<TProps>) {
  const component = props.component;
  const currentProps = props.props;
  const hostRef = useRef<HTMLDivElement | null>(null);
  const currentPropsRef = useRef(currentProps);
  const setPropsRef = useRef<Setter<TProps> | null>(null);

  currentPropsRef.current = currentProps;

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }

    const [solidProps, setSolidProps] = createSignal(currentPropsRef.current, { equals: false });
    setPropsRef.current = setSolidProps;

    const dispose = render(() => component(solidProps), host);
    return () => {
      setPropsRef.current = null;
      dispose();
    };
  }, [component]);

  useLayoutEffect(() => {
    setPropsRef.current?.(() => currentProps);
  }, [currentProps]);

  return <div ref={hostRef} className={props.className} data-solid-island="" />;
}
