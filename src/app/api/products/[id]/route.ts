import { NextRequest, NextResponse } from 'next/server';
import { deleteProduct, getProduct, updateProduct } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const product = await getProduct(params.id);
  if (!product) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
  return NextResponse.json({ product });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const patch = await req.json();
  // Nunca permitimos cambiar gtin ni id por integridad
  delete patch.gtin;
  delete patch.id;
  delete patch.createdAt;
  const product = await updateProduct(params.id, patch);
  if (!product) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
  return NextResponse.json({ product });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ok = await deleteProduct(params.id);
  if (!ok) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
  return NextResponse.json({ deleted: true });
}
