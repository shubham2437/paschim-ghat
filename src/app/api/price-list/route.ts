import { NextResponse } from 'next/server';
import { getCatalogSnapshot } from '@/data/catalog.server';
import { getSiteConfig } from '@/data/site-content.server';
import { clientKeyFromHeaders, rateLimit } from '@/lib/server/rate-limit';
import { off, perUnit } from '@/lib/utils/format';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const AVAILABILITY = { in: 'In Stock', low: 'Low Stock', out: 'Out of Stock' } as const;

function csvCell(value: string | number): string {
  // Neutralise spreadsheet formula injection as well as quotes.
  const text = String(value);
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  const key = clientKeyFromHeaders(request.headers);
  const limited = rateLimit(`price-list:${key}`, { limit: 10, windowMs: 60_000 });
  if (!limited.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const [{ products }, { settings }] = await Promise.all([getCatalogSnapshot(), getSiteConfig()]);

  const rows: string[][] = [
    ['Product ID', 'Product', 'English / Other Name', 'Category', 'Pack', 'MRP (INR)', 'Selling price (INR)', 'Discount %', 'Unit price', 'Availability'],
  ];
  for (const p of products) {
    for (const v of p.vars) {
      rows.push([
        v.sku,
        p.name,
        p.alt,
        p.catName,
        v.w,
        String(v.mrp),
        String(v.p),
        `${off(v)}%`,
        perUnit(v),
        AVAILABILITY[v.avail],
      ]);
    }
  }

  const csv = '﻿' + rows.map((r) => r.map(csvCell).join(',')).join('\n');
  const fileName = `${settings.brand_name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'store'}-price-list.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Cache-Control': 'no-store',
    },
  });
}
