import React, { useRef } from 'react';
import { Plus, Trash2, ImagePlus } from 'lucide-react';
import { OrderProduct } from '@/hooks/useOrders';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Props {
  products: OrderProduct[];
  onChange: (products: OrderProduct[]) => void;
  editable?: boolean;
  onUploadImage?: (file: File) => Promise<string>;
}

export const OrderProductsTable: React.FC<Props> = ({ products, onChange, editable = false, onUploadImage }) => {
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const addRow = () => {
    onChange([...products, { product_id: `P-${Date.now()}`, name: '', quantity: 1, price: 0, total: 0, image_url: '' }]);
  };

  const updateRow = (index: number, field: keyof OrderProduct, value: string | number) => {
    const updated = [...products];
    const row = { ...updated[index], [field]: value };
    if (field === 'quantity' || field === 'price') {
      row.total = Number(row.quantity) * Number(row.price);
    }
    updated[index] = row;
    onChange(updated);
  };

  const removeRow = (index: number) => {
    onChange(products.filter((_, i) => i !== index));
  };

  const handleImageUpload = async (index: number, file: File) => {
    if (!onUploadImage) return;
    try {
      const url = await onUploadImage(file);
      updateRow(index, 'image_url', url);
    } catch {
      // error handled upstream
    }
  };

  const ProductThumbnail = ({ url }: { url?: string }) => (
    <div className="w-8 h-8 rounded bg-muted flex-shrink-0 overflow-hidden">
      {url ? (
        <img src={url} alt="" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-[10px]">—</div>
      )}
    </div>
  );

  return (
    <div className="overflow-x-auto -mx-2 px-2">
      {/* Mobile card layout for read-only */}
      {!editable && (
        <div className="sm:hidden space-y-3">
          {products.map((p, i) => (
            <div key={i} className="rounded-lg border border-border/50 p-3 space-y-1">
              <div className="flex justify-between items-start gap-2">
                <div className="flex items-center gap-2">
                  <ProductThumbnail url={p.image_url} />
                  <div>
                    <p className="text-sm font-medium text-foreground">{p.name || 'Unnamed'}</p>
                    <p className="text-xs text-muted-foreground">{p.product_id}</p>
                  </div>
                </div>
                <p className="text-sm font-medium text-foreground">${Number(p.total).toFixed(2)}</p>
              </div>
              <div className="flex gap-3 text-xs text-muted-foreground">
                <span>Qty: {p.quantity}</span>
                <span>@ ${Number(p.price).toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Desktop table (always shown for editable, hidden on mobile for read-only) */}
      <table className={`w-full text-sm ${!editable ? 'hidden sm:table' : ''}`}>
        <thead>
          <tr className="text-xs text-muted-foreground border-b border-border">
            <th className="text-left py-2 font-medium w-10">Image</th>
            <th className="text-left py-2 font-medium">Product ID</th>
            <th className="text-left py-2 font-medium">Product Name</th>
            <th className="text-left py-2 font-medium">Quantity</th>
            <th className="text-left py-2 font-medium">Price</th>
            <th className="text-left py-2 font-medium">Total</th>
            {editable && <th className="w-8" />}
          </tr>
        </thead>
        <tbody>
          {products.map((p, i) => (
            <tr key={i} className="border-b border-border/50">
              {editable ? (
                <>
                  <td className="py-2 pr-2">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      ref={el => { fileInputRefs.current[i] = el; }}
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(i, file);
                      }}
                    />
                    {p.image_url ? (
                      <div className="w-8 h-8 rounded bg-muted overflow-hidden cursor-pointer" onClick={() => fileInputRefs.current[i]?.click()}>
                        <img src={p.image_url} alt="" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <Button type="button" variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground" onClick={() => fileInputRefs.current[i]?.click()}>
                        <ImagePlus className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </td>
                  <td className="py-2 pr-2"><Input value={p.product_id} onChange={e => updateRow(i, 'product_id', e.target.value)} className="h-8" /></td>
                  <td className="py-2 pr-2"><Input value={p.name} onChange={e => updateRow(i, 'name', e.target.value)} className="h-8" /></td>
                  <td className="py-2 pr-2"><Input type="number" value={p.quantity} onChange={e => updateRow(i, 'quantity', Number(e.target.value))} className="h-8 w-20" /></td>
                  <td className="py-2 pr-2"><Input type="number" step="0.01" value={p.price} onChange={e => updateRow(i, 'price', Number(e.target.value))} className="h-8 w-24" /></td>
                  <td className="py-2 text-foreground">${p.total.toFixed(2)}</td>
                  <td className="py-2"><Button type="button" variant="ghost" size="icon" className="w-7 h-7 text-destructive hover:text-destructive" onClick={() => removeRow(i)}><Trash2 className="w-3.5 h-3.5" /></Button></td>
                </>
              ) : (
                <>
                  <td className="py-2"><ProductThumbnail url={p.image_url} /></td>
                  <td className="py-2 text-muted-foreground">{p.product_id}</td>
                  <td className="py-2 text-foreground">{p.name}</td>
                  <td className="py-2 text-foreground">{p.quantity}</td>
                  <td className="py-2 text-foreground">${Number(p.price).toFixed(2)}</td>
                  <td className="py-2 text-foreground">${Number(p.total).toFixed(2)}</td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {editable && (
        <Button type="button" variant="ghost" size="sm" className="mt-2 gap-1 text-muted-foreground hover:text-foreground" onClick={addRow}>
          <Plus className="w-3.5 h-3.5" /> Add Product
        </Button>
      )}
    </div>
  );
};
