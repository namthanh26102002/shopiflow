import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Loader2, Upload } from 'lucide-react';
import type { WinningProduct } from '@/hooks/useWinningProducts';

interface Props {
  product?: WinningProduct;
  onSubmit: (data: any) => void;
  onUploadImage: (file: File) => Promise<string>;
  isSubmitting: boolean;
}

export const ProductForm: React.FC<Props> = ({ product, onSubmit, onUploadImage, isSubmitting }) => {
  const [name, setName] = useState(product?.name ?? '');
  const [description, setDescription] = useState(product?.description ?? '');
  const [niche, setNiche] = useState(product?.niche ?? '');
  const [imageUrl, setImageUrl] = useState(product?.image_url ?? '');
  const [published, setPublished] = useState(product?.published ?? false);
  const [uploading, setUploading] = useState(false);

  // Creative videos (up to 4)
  const defaultVideos = product?.creative_videos?.length ? product.creative_videos : ['', '', '', ''];
  const [videos, setVideos] = useState<string[]>([...defaultVideos, '', '', '', ''].slice(0, 4));

  // Performance metrics
  const [trend, setTrend] = useState(product?.product_performance?.trend ?? 3);
  const [saturation, setSaturation] = useState(product?.product_performance?.saturation ?? 3);
  const [competition, setCompetition] = useState(product?.product_performance?.competition ?? 3);
  const [profitMargin, setProfitMargin] = useState(product?.product_performance?.profit_margin ?? 3);
  const [growthRate, setGrowthRate] = useState(product?.product_performance?.growth_rate ?? 3);

  // Traffic (5 months)
  const defaultTraffic = product?.website_traffic?.length === 5
    ? product.website_traffic
    : [
        { month: 'Oct', visits: 0 },
        { month: 'Nov', visits: 0 },
        { month: 'Dec', visits: 0 },
        { month: 'Jan', visits: 0 },
        { month: 'Feb', visits: 0 },
      ];
  const [traffic, setTraffic] = useState(defaultTraffic);

  // Custom links (up to 3)
  const defaultLinks = product?.custom_links?.length ? product.custom_links : [];
  const [customLinks, setCustomLinks] = useState<{ label: string; url: string }[]>(
    [...defaultLinks, { label: '', url: '' }, { label: '', url: '' }, { label: '', url: '' }].slice(0, 3)
  );

  // Customer state & aspirational identity
  const [customerState, setCustomerState] = useState((product?.customer_state ?? []).join('\n'));
  const [aspirational, setAspirational] = useState((product?.customer_aspirational_identity ?? []).join('\n'));

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await onUploadImage(file);
      setImageUrl(url);
    } catch {
      // error handled in hook
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      description,
      niche,
      image_url: imageUrl || null,
      estimated_total_sales_60d: '',
      estimated_daily_sales: '',
      last_month_revenue: 0,
      published,
      product_performance: { trend, saturation, competition, profit_margin: profitMargin, growth_rate: growthRate },
      website_traffic: traffic,
      customer_state: customerState.split('\n').filter(Boolean),
      customer_aspirational_identity: aspirational.split('\n').filter(Boolean),
      creative_videos: videos.filter(Boolean),
      custom_links: customLinks.filter(l => l.label.trim() && l.url.trim()),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-h-[70vh] overflow-y-auto pr-2 scrollbar-thin">
      {/* Basic Info */}
      <div className="space-y-3">
        <div>
          <Label>Product Name *</Label>
          <Input value={name} onChange={e => setName(e.target.value)} required />
        </div>
        <div>
          <Label>Niche / Category</Label>
          <Input value={niche} onChange={e => setNiche(e.target.value)} placeholder="e.g. Health & Beauty" />
        </div>
        <div>
          <Label>Description</Label>
          <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} />
        </div>
        <div>
          <Label>Product Image</Label>
          <div className="flex items-center gap-3 mt-1">
            {imageUrl && <img src={imageUrl} alt="" className="w-16 h-16 rounded-lg object-cover" />}
            <label className="cursor-pointer">
              <div className="flex items-center gap-2 px-3 py-2 border border-input rounded-md text-sm hover:bg-secondary transition-colors">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {uploading ? 'Uploading...' : 'Upload'}
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </label>
          </div>
        </div>
      </div>


      {/* Performance (1-5) */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-foreground">Performance Metrics (1-5)</h4>
        <div className="grid grid-cols-5 gap-2">
          {[
            { label: 'Trend', val: trend, set: setTrend },
            { label: 'Saturation', val: saturation, set: setSaturation },
            { label: 'Competition', val: competition, set: setCompetition },
            { label: 'Profit', val: profitMargin, set: setProfitMargin },
            { label: 'Growth', val: growthRate, set: setGrowthRate },
          ].map(m => (
            <div key={m.label}>
              <Label className="text-xs">{m.label}</Label>
              <Input type="number" min={1} max={5} value={m.val} onChange={e => m.set(Number(e.target.value))} />
            </div>
          ))}
        </div>
      </div>

      {/* Traffic */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-foreground">Website Traffic (Last 5 Months)</h4>
        <div className="grid grid-cols-5 gap-2">
          {traffic.map((t, i) => (
            <div key={i}>
              <Label className="text-xs">{t.month}</Label>
              <Input
                type="text"
                inputMode="numeric"
                value={t.visits === 0 ? '' : String(t.visits)}
                onChange={e => {
                  const raw = e.target.value.replace(/[^0-9]/g, '');
                  const updated = [...traffic];
                  updated[i] = { ...t, visits: raw === '' ? 0 : parseInt(raw, 10) };
                  setTraffic(updated);
                }}
                placeholder="0"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Top Creative Frameworks */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-foreground">Top Creative Frameworks</h4>
        <div className="grid grid-cols-2 gap-3">
          {videos.map((url, i) => (
            <div key={i}>
              <Label className="text-xs">Video {i + 1} URL</Label>
              <Input
                value={url}
                onChange={e => {
                  const updated = [...videos];
                  updated[i] = e.target.value;
                  setVideos(updated);
                }}
                placeholder="https://youtube.com/watch?v=..."
              />
            </div>
          ))}
        </div>
      </div>

      {/* Custom Links */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-foreground">Custom Links (up to 3)</h4>
        {customLinks.map((link, i) => (
          <div key={i} className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Label {i + 1}</Label>
              <Input
                value={link.label}
                onChange={e => {
                  const updated = [...customLinks];
                  updated[i] = { ...link, label: e.target.value };
                  setCustomLinks(updated);
                }}
                placeholder="e.g. Website, Ad Library"
              />
            </div>
            <div>
              <Label className="text-xs">URL {i + 1}</Label>
              <Input
                value={link.url}
                onChange={e => {
                  const updated = [...customLinks];
                  updated[i] = { ...link, url: e.target.value };
                  setCustomLinks(updated);
                }}
                placeholder="https://..."
              />
            </div>
          </div>
        ))}
      </div>

      {/* Customer Info */}
      <div className="space-y-3">
        <div>
          <Label>Customer State (one per line)</Label>
          <Textarea value={customerState} onChange={e => setCustomerState(e.target.value)} rows={4} placeholder="Frustrated with current solutions&#10;Looking for affordable alternatives" />
        </div>
        <div>
          <Label>Customer Aspirational Identity (one per line)</Label>
          <Textarea value={aspirational} onChange={e => setAspirational(e.target.value)} rows={4} placeholder="Wants to be seen as trendy&#10;Values sustainability" />
        </div>
      </div>

      {/* Published */}
      <div className="flex items-center gap-3">
        <Switch checked={published} onCheckedChange={setPublished} />
        <Label>Published (visible to users)</Label>
      </div>

      <Button type="submit" disabled={isSubmitting || !name} className="w-full">
        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
        {product ? 'Update Product' : 'Create Product'}
      </Button>
    </form>
  );
};
