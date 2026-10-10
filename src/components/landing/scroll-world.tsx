"use client";

import { useEffect, useRef } from "react";
import { mountScrollWorld, type ScrollWorldConfig } from "./scrub-engine";

export function ScrollWorld({ config }: { config: ScrollWorldConfig }) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!container.current) return;
    return mountScrollWorld(container.current, config);
  }, [config]);

  return <div ref={container} />;
}
