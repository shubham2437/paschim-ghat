import Image from 'next/image';

export function BrandLogo({ alt, size = 42 }: { alt: string; size?: number }) {
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
        priority
        style={{ objectFit: 'cover', width: '100%', height: '100%', borderRadius: '50%' }}
      />
    </span>
  );
}
