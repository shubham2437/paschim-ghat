'use client';

import { useMemo } from 'react';
import { art, hamperArt } from '@/features/catalog/product-art';
import type { ArtKind } from '@/types/product';

interface ProductArtProps {
  kind: ArtKind;
  seed: number;
  w?: number;
  h?: number;
  className?: string;
}

/**
 * Renders deterministic, procedurally generated SVG "product photography".
 * `kind`/`seed` are always internal, typed values (never raw user input),
 * so the generated markup is safe to inject.
 */
export function ProductArt({ kind, seed, w = 420, h = 320, className }: ProductArtProps) {
  const markup = useMemo(() => art(kind, seed, w, h), [kind, seed, w, h]);
  // eslint-disable-next-line react/no-danger
  return <div className={className} dangerouslySetInnerHTML={{ __html: markup }} />;
}

interface HamperArtProps {
  seed: number;
  label: string;
  className?: string;
}

export function HamperArt({ seed, label, className }: HamperArtProps) {
  const markup = useMemo(() => hamperArt(seed, label), [seed, label]);
  // eslint-disable-next-line react/no-danger
  return <div className={className} dangerouslySetInnerHTML={{ __html: markup }} />;
}
