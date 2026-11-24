import Image from 'next/image';

export function BrandLogo({ alt, size = 42, priority = false }: { alt: string; size?: number; priority?: boolean }) {
  return (
    <span
      className="logo-mk"
      style={{ background: 'none', boxShadow: 'none', overflow: 'hidden', borderRadius: '50%' }}
    >
      <Image
        src="/logo.png"
        alt={alt}
        width={size}
        height={size}
        priority={priority}
        loading={priority ? undefined : 'lazy'}
        style={{ objectFit: 'cover', width: '100%', height: '100%', borderRadius: '50%' }}
      />
    </span>
  );
}
