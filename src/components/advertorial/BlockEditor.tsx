import React, { useRef } from 'react';
import { RichTextEditor } from '@/components/advertorial/RichTextEditor';
import { useAdvertorial } from '@/contexts/AdvertorialContext';
import { AdvertorialBlock, FacebookCommentsBlock, BreadcrumbBlock, HeroBlock, VideoBlock, ImportantUpdateBlock, YouTubeBlock } from '@/types/advertorial';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Upload, Link, User } from 'lucide-react';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FacebookCommentsEditor } from './FacebookCommentsEditor';
import { useT, type Translate } from '@/i18n';

export const BlockEditor: React.FC = () => {
  const t = useT();
  const { advertorial, selectedBlockId, updateBlock, isLesson } = useAdvertorial();
  
  const selectedBlock = advertorial.blocks.find(b => b.id === selectedBlockId);
  
  if (!selectedBlock) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-secondary mx-auto mb-3 flex items-center justify-center">
            <span className="text-xl">👆</span>
          </div>
          <p className="text-sm font-medium text-foreground">{t('Select a block')}</p>
          <p className="text-xs text-muted-foreground mt-1">{t('Click a block from the list above to edit')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-muted/40">
      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground capitalize">{selectedBlock.type.replace('-', ' ')}</h2>
        <p className="text-xs text-muted-foreground">{t('Edit block properties')}</p>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {renderBlockEditor(selectedBlock, updateBlock, t, isLesson)}
        </div>
      </ScrollArea>
    </div>
  );
};

function renderBlockEditor(
  block: AdvertorialBlock, 
  updateBlock: <T extends AdvertorialBlock>(id: string, updates: Partial<T>) => void,
  t: Translate,
  isLesson?: boolean
) {
  switch (block.type) {
    case 'alert-banner':
      return (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs">{t('Banner Text')}</Label>
            <Input
              value={block.text}
              onChange={(e) => updateBlock(block.id, { text: e.target.value })}
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t('Background Color')}</Label>
            <div className="flex gap-2">
              <input
                type="color"
                value={block.backgroundColor}
                onChange={(e) => updateBlock(block.id, { backgroundColor: e.target.value })}
                className="w-10 h-9 rounded-md border border-input cursor-pointer"
              />
              <Input
                value={block.backgroundColor}
                onChange={(e) => updateBlock(block.id, { backgroundColor: e.target.value })}
                className="h-9 text-sm font-mono flex-1"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t('Text Color')}</Label>
            <div className="flex gap-2">
              <input
                type="color"
                value={block.textColor}
                onChange={(e) => updateBlock(block.id, { textColor: e.target.value })}
                className="w-10 h-9 rounded-md border border-input cursor-pointer"
              />
              <Input
                value={block.textColor}
                onChange={(e) => updateBlock(block.id, { textColor: e.target.value })}
                className="h-9 text-sm font-mono flex-1"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t('Custom Icon (SVG)')}</Label>
            <Textarea
              value={block.iconSvg || ''}
              onChange={(e) => updateBlock(block.id, { iconSvg: e.target.value })}
              placeholder={t('Paste SVG code here...')}
              className="text-sm min-h-[80px] resize-none font-mono"
            />
            {block.iconSvg && (
              <div className="flex items-center gap-2 p-2 border border-border rounded-md">
                <span className="text-xs text-muted-foreground">{t('Preview:')}</span>
                <div
                  className="w-5 h-5 flex-shrink-0"
                  style={{ color: block.iconColor || block.textColor }}
                  dangerouslySetInnerHTML={{ __html: block.iconSvg.replace(/width="[^"]*"/, 'width="100%"').replace(/height="[^"]*"/, 'height="100%"') }}
                />
              </div>
            )}
          </div>
          {block.iconSvg && (
            <div className="space-y-1.5">
              <Label className="text-xs">{t('Icon Color')}</Label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={block.iconColor || '#000000'}
                  onChange={(e) => updateBlock(block.id, { iconColor: e.target.value })}
                  className="w-10 h-9 rounded-md border border-input cursor-pointer"
                />
                <Input
                  value={block.iconColor || ''}
                  onChange={(e) => updateBlock(block.id, { iconColor: e.target.value })}
                  className="h-9 text-sm font-mono flex-1"
                  placeholder="#000000"
                />
              </div>
            </div>
          )}
        </>
      );

    case 'hero':
      return <HeroBlockEditor block={block} updateBlock={updateBlock} isLesson={isLesson} />;




    case 'text':
      return <TextBlockEditor block={block} updateBlock={updateBlock} />;

    case 'image':
      return <ImageBlockEditor block={block} updateBlock={updateBlock} />;

    case 'video':
      return <VideoBlockEditor block={block} updateBlock={updateBlock} />;

    case 'breadcrumb':
      return <BreadcrumbBlockEditor block={block} updateBlock={updateBlock} />;

    case 'facebook-comments':
      return <FacebookCommentsEditor block={block} updateBlock={updateBlock} />;

    case 'cta-button':
      return (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs">{t('Button Text')}</Label>
            <Input
              value={block.text}
              onChange={(e) => updateBlock(block.id, { text: e.target.value })}
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t('Link URL')}</Label>
            <Input
              value={block.url}
              onChange={(e) => updateBlock(block.id, { url: e.target.value })}
              placeholder="https://..."
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t('Button Color')}</Label>
            <div className="flex gap-2">
              <input
                type="color"
                value={block.color}
                onChange={(e) => updateBlock(block.id, { color: e.target.value })}
                className="w-10 h-9 rounded-md border border-input cursor-pointer"
              />
              <Input
                value={block.color}
                onChange={(e) => updateBlock(block.id, { color: e.target.value })}
                className="h-9 text-sm font-mono flex-1"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t('Size')}</Label>
            <Select
              value={block.size}
              onValueChange={(value: 'small' | 'medium' | 'large') => updateBlock(block.id, { size: value })}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small">{t('Small')}</SelectItem>
                <SelectItem value="medium">{t('Medium')}</SelectItem>
                <SelectItem value="large">{t('Large')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs">{t('Full Width')}</Label>
            <Switch
              checked={block.fullWidth}
              onCheckedChange={(checked) => updateBlock(block.id, { fullWidth: checked })}
            />
          </div>
        </>
      );

    case 'divider':
      return (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs">{t('Style')}</Label>
            <Select
              value={block.style}
              onValueChange={(value: 'line' | 'space' | 'dots') => updateBlock(block.id, { style: value })}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="line">{t('Line')}</SelectItem>
                <SelectItem value="space">{t('Space')}</SelectItem>
                <SelectItem value="dots">{t('Dots')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t('Height (px)')}</Label>
            <Input
              type="number"
              value={block.height}
              onChange={(e) => updateBlock(block.id, { height: Number(e.target.value) })}
              min={8}
              max={100}
              className="h-9 text-sm"
            />
          </div>
        </>
      );

    case 'important-update':
      return <ImportantUpdateBlockEditor block={block} updateBlock={updateBlock} />;

    case 'youtube':
      return <YouTubeBlockEditor block={block as YouTubeBlock} updateBlock={updateBlock} />;

    default:
      return <p className="text-sm text-muted-foreground">{t('Editor not available for this block type.')}</p>;
  }
}

// YouTube Block Editor
function YouTubeBlockEditor({
  block,
  updateBlock,
}: {
  block: YouTubeBlock;
  updateBlock: <T extends AdvertorialBlock>(id: string, updates: Partial<T>) => void;
}) {
  const t = useT();
  const extractVideoId = (input: string): string => {
    // Handle direct video IDs
    if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;
    // Handle various YouTube URL formats
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    ];
    for (const pattern of patterns) {
      const match = input.match(pattern);
      if (match) return match[1];
    }
    return input;
  };

  return (
    <>
      <div className="space-y-1.5">
        <Label className="text-xs">{t('YouTube URL or Video ID')}</Label>
        <Input
          value={block.videoId}
          onChange={(e) => {
            const videoId = extractVideoId(e.target.value.trim());
            updateBlock(block.id, { videoId });
          }}
          className="h-9 text-sm"
          placeholder={t('Paste YouTube URL or video ID...')}
        />
      </div>

      {block.videoId && /^[a-zA-Z0-9_-]{11}$/.test(block.videoId) && (
        <div className="rounded-md border border-border overflow-hidden">
          <iframe
            src={`https://www.youtube.com/embed/${block.videoId}`}
            className="w-full aspect-video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}

      <div className="space-y-1.5">
        <Label className="text-xs">{t('Caption')}</Label>
        <Input
          value={block.caption}
          onChange={(e) => updateBlock(block.id, { caption: e.target.value })}
          className="h-9 text-sm"
          placeholder={t('Optional caption...')}
        />
      </div>
    </>
  );
}

// Image Block Editor Component with file upload
function ImageBlockEditor({ 
  block, 
  updateBlock 
}: { 
  block: Extract<AdvertorialBlock, { type: 'image' }>;
  updateBlock: <T extends AdvertorialBlock>(id: string, updates: Partial<T>) => void;
}) {
  const t = useT();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateBlock(block.id, { src: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <>
      <div className="space-y-2">
        <Label className="text-xs">{t('Image Source')}</Label>
        
        {/* File Upload */}
        <div className="space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full h-9 text-sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-4 h-4 mr-2" />
            {t('Upload from Computer')}
          </Button>
        </div>
        
        {/* URL Input */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Link className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          <Input
            value={block.src.startsWith('data:') ? '' : block.src}
            onChange={(e) => updateBlock(block.id, { src: e.target.value })}
            placeholder={t('Or paste image URL...')}
            className="h-9 text-sm pl-9"
          />
        </div>
        
        {/* Preview */}
        {block.src && (
          <div className="mt-2 rounded-md border border-border overflow-hidden">
            <img 
              src={block.src} 
              alt={block.alt || t('Preview')} 
              className="w-full h-24 object-cover"
            />
          </div>
        )}
      </div>
      
      <div className="space-y-1.5">
        <Label className="text-xs">{t('Alt Text')}</Label>
        <Input
          value={block.alt}
          onChange={(e) => updateBlock(block.id, { alt: e.target.value })}
          className="h-9 text-sm"
          placeholder={t('Describe the image...')}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">{t('Caption')}</Label>
        <Input
          value={block.caption}
          onChange={(e) => updateBlock(block.id, { caption: e.target.value })}
          className="h-9 text-sm"
          placeholder={t('Optional caption...')}
        />
      </div>
    </>
  );
}

// Breadcrumb Block Editor Component
function BreadcrumbBlockEditor({ 
  block, 
  updateBlock 
}: { 
  block: BreadcrumbBlock;
  updateBlock: <T extends AdvertorialBlock>(id: string, updates: Partial<T>) => void;
}) {
  const t = useT();
  const handleUpdateItem = (index: number, field: 'label' | 'url', value: string) => {
    const newItems = [...block.items];
    newItems[index] = { ...newItems[index], [field]: value };
    updateBlock(block.id, { items: newItems });
  };

  const handleAddItem = () => {
    const newItems = [...block.items, { label: 'New Item' }];
    updateBlock(block.id, { items: newItems });
  };

  const handleRemoveItem = (index: number) => {
    if (block.items.length <= 1) return;
    const newItems = block.items.filter((_, i) => i !== index);
    updateBlock(block.id, { items: newItems });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs">{t('Breadcrumb Items')}</Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={handleAddItem}
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          {t('Add')}
        </Button>
      </div>
      
      <div className="space-y-2">
        {block.items.map((item, index) => (
          <div key={index} className="flex gap-2 items-start">
            <div className="flex-1 space-y-1.5">
              <Input
                value={item.label}
                onChange={(e) => handleUpdateItem(index, 'label', e.target.value)}
                placeholder={t('Label')}
                className="h-8 text-sm"
              />
              <Input
                value={item.url || ''}
                onChange={(e) => handleUpdateItem(index, 'url', e.target.value)}
                placeholder={t('URL (optional)')}
                className="h-8 text-sm text-muted-foreground"
              />
            </div>
            <Button aria-label={t('Remove item')}
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
              onClick={() => handleRemoveItem(index)}
              disabled={block.items.length <= 1}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        ))}
      </div>
      
      <p className="text-xs text-muted-foreground">
        {t('Last item is typically the current page (no URL needed)')}
      </p>
    </div>
  );
}

// Hero Block Editor Component with author image upload and media
function HeroBlockEditor({ 
  block, 
  updateBlock,
  isLesson 
}: { 
  block: HeroBlock;
  updateBlock: <T extends AdvertorialBlock>(id: string, updates: Partial<T>) => void;
  isLesson?: boolean;
}) {
  const t = useT();
  const authorFileInputRef = useRef<HTMLInputElement>(null);
  const mediaFileInputRef = useRef<HTMLInputElement>(null);

  const handleAuthorUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateBlock(block.id, { authorImageUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (block.mediaType === 'video') {
          updateBlock(block.id, { videoSrc: reader.result as string });
        } else if (block.mediaType === 'image') {
          updateBlock(block.id, { imageSrc: reader.result as string });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleMediaTypeChange = (value: string) => {
    // Clear the other media when switching
    if (value === 'none') {
      updateBlock(block.id, { mediaType: 'none' as const, videoSrc: '', imageSrc: '', imageAlt: '' });
    } else if (value === 'video') {
      updateBlock(block.id, { mediaType: 'video' as const, imageSrc: '', imageAlt: '' });
    } else if (value === 'image') {
      updateBlock(block.id, { mediaType: 'image' as const, videoSrc: '' });
    }
  };

  return (
    <>
      <div className="space-y-1.5">
        <Label className="text-xs">{t('Headline')}</Label>
        <RichTextEditor
          value={block.headline}
          onChange={(html) => updateBlock(block.id, { headline: html })}
          placeholder={t('Your headline...')}
          minHeight="60px"
        />
      </div>

      {/* Hero Media Section */}
      <div className="space-y-3 pt-2 border-t border-border">
        <Label className="text-xs font-medium">{t('Hero Media')}</Label>
        <Select
          value={block.mediaType || 'none'}
          onValueChange={handleMediaTypeChange}
        >
          <SelectTrigger className="h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{t('No Media')}</SelectItem>
            <SelectItem value="video">{t('Video')}</SelectItem>
            <SelectItem value="image">{t('Image')}</SelectItem>
          </SelectContent>
        </Select>

        {block.mediaType === 'video' && (
          <div className="space-y-2">
            <input
              ref={mediaFileInputRef}
              type="file"
              accept="video/*"
              onChange={handleMediaUpload}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full h-9 text-sm"
              onClick={() => mediaFileInputRef.current?.click()}
            >
              <Upload className="w-4 h-4 mr-2" />
              {t('Upload Video')}
            </Button>
            {block.videoSrc && (
              <div className="rounded-md border border-border overflow-hidden">
                <video src={block.videoSrc} muted autoPlay loop className="w-full h-24 object-cover" />
              </div>
            )}
          </div>
        )}

        {block.mediaType === 'image' && (
          <div className="space-y-2">
            <input
              ref={mediaFileInputRef}
              type="file"
              accept="image/*"
              onChange={handleMediaUpload}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full h-9 text-sm"
              onClick={() => mediaFileInputRef.current?.click()}
            >
              <Upload className="w-4 h-4 mr-2" />
              {t('Upload Image')}
            </Button>
            {block.imageSrc && (
              <div className="rounded-md border border-border overflow-hidden">
                <img src={block.imageSrc} alt={block.imageAlt || t('Preview')} className="w-full h-24 object-cover" />
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs">{t('Image Alt Text')}</Label>
              <Input
                value={block.imageAlt || ''}
                onChange={(e) => updateBlock(block.id, { imageAlt: e.target.value })}
                className="h-9 text-sm"
                placeholder={t('Describe the image...')}
              />
            </div>
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">{t('Subheadline')}</Label>
        <RichTextEditor
          value={block.subheadline}
          onChange={(html) => updateBlock(block.id, { subheadline: html })}
          placeholder={t('Your subheadline...')}
          minHeight="60px"
        />
      </div>
      
      {!isLesson && (
        <>
          {/* Author Section */}
          <div className="space-y-3 pt-2 border-t border-border">
            <Label className="text-xs font-medium">{t('Author Info')}</Label>
            
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">{t('Author Image')}</Label>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-secondary flex-shrink-0 overflow-hidden flex items-center justify-center border-2 border-emerald-500">
                  {block.authorImageUrl ? (
                    <img src={block.authorImageUrl} alt={block.author} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-6 h-6 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <input
                    ref={authorFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAuthorUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full h-8 text-xs"
                    onClick={() => authorFileInputRef.current?.click()}
                  >
                    <Upload className="w-3.5 h-3.5 mr-1.5" />
                    {t('Upload Photo')}
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">{t('Author Name')}</Label>
              <Input
                value={block.author}
                onChange={(e) => updateBlock(block.id, { author: e.target.value })}
                className="h-9 text-sm"
                placeholder={t('e.g., Dr. Jessica Thompson')}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t('Date')}</Label>
              <Input
                value={block.date}
                onChange={(e) => updateBlock(block.id, { date: e.target.value })}
                className="h-9 text-sm"
                placeholder={t('e.g., February 6, 2026')}
              />
            </div>
          </div>
        </>
      )}
    </>
  );
}

// Text Block Editor with font size and family
function TextBlockEditor({
  block,
  updateBlock
}: {
  block: Extract<AdvertorialBlock, { type: 'text' }>;
  updateBlock: <T extends AdvertorialBlock>(id: string, updates: Partial<T>) => void;
}) {
  const t = useT();
  const fontOptions = [
    { value: '', label: t('Default (Global)') },
    { value: 'system-ui', label: 'System UI' },
    { value: 'Inter', label: 'Inter' },
    { value: 'Georgia', label: 'Georgia' },
    { value: 'Times New Roman', label: 'Times New Roman' },
    { value: 'Arial', label: 'Arial' },
    { value: 'Helvetica', label: 'Helvetica' },
    { value: 'Verdana', label: 'Verdana' },
    { value: 'Trebuchet MS', label: 'Trebuchet MS' },
    { value: 'Courier New', label: 'Courier New' },
  ];

  return (
    <>
      <div className="space-y-1.5">
        <Label className="text-xs">{t('Content')}</Label>
        <RichTextEditor
          value={block.content}
          onChange={(html) => updateBlock(block.id, { content: html })}
          placeholder={t('Enter your text content...')}
          minHeight="200px"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">{t('Font Size (px)')}</Label>
        <Input
          type="number"
          value={block.fontSize || 16}
          onChange={(e) => updateBlock(block.id, { fontSize: Number(e.target.value) })}
          min={10}
          max={48}
          className="h-9 text-sm"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">{t('Font Family')}</Label>
        <Select
          value={block.fontFamily || 'default_global'}
          onValueChange={(value) => updateBlock(block.id, { fontFamily: value === 'default_global' ? '' : value })}
        >
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder={t('Default')} />
          </SelectTrigger>
          <SelectContent>
            {fontOptions.map(f => (
              <SelectItem key={f.value || 'default'} value={f.value || 'default_global'}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">{t('Bullet List Background')}</Label>
        <div className="flex gap-2">
          <input
            type="color"
            value={block.listBackgroundColor || '#f0fdf4'}
            onChange={(e) => updateBlock(block.id, { listBackgroundColor: e.target.value })}
            className="w-10 h-9 rounded-md border border-input cursor-pointer"
          />
          <Input
            value={block.listBackgroundColor}
            onChange={(e) => updateBlock(block.id, { listBackgroundColor: e.target.value })}
            className="h-9 text-sm font-mono flex-1"
            placeholder={t('No background')}
          />
        </div>
        <p className="text-xs text-muted-foreground">{t('Leave empty for no background on lists')}</p>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">{t('Bullet List Icon')}</Label>
        <Select
          value={block.listIconType || 'default'}
          onValueChange={(value: 'default' | 'tick' | 'x') => updateBlock(block.id, { listIconType: value })}
        >
          <SelectTrigger className="h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">{t('Default Bullet')}</SelectItem>
            <SelectItem value="tick">{t('✓ Tick')}</SelectItem>
            <SelectItem value="x">{t('✕ X Mark')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {block.listIconType && block.listIconType !== 'default' && (
        <div className="space-y-1.5">
          <Label className="text-xs">{t('Icon Color')}</Label>
          <div className="flex gap-2">
            <input
              type="color"
              value={block.listIconColor || '#000000'}
              onChange={(e) => updateBlock(block.id, { listIconColor: e.target.value })}
              className="w-10 h-9 rounded-md border border-input cursor-pointer"
            />
            <Input
              value={block.listIconColor || ''}
              onChange={(e) => updateBlock(block.id, { listIconColor: e.target.value })}
              className="h-9 text-sm font-mono flex-1"
              placeholder="#000000"
            />
          </div>
        </div>
      )}
    </>
  );
}

// Video Block Editor Component with file upload
function VideoBlockEditor({ 
  block, 
  updateBlock 
}: { 
  block: VideoBlock;
  updateBlock: <T extends AdvertorialBlock>(id: string, updates: Partial<T>) => void;
}) {
  const t = useT();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateBlock(block.id, { src: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <>
      <div className="space-y-2">
        <Label className="text-xs">{t('Video Source')}</Label>
        
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          onChange={handleFileUpload}
          className="hidden"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full h-9 text-sm"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="w-4 h-4 mr-2" />
          {t('Upload Video from Computer')}
        </Button>
        
        {/* Preview */}
        {block.src && (
          <div className="mt-2 rounded-md border border-border overflow-hidden">
            <video 
              src={block.src} 
              controls
              className="w-full h-32 object-cover"
            />
          </div>
        )}
      </div>
      
      <div className="space-y-1.5">
        <Label className="text-xs">{t('Caption')}</Label>
        <Input
          value={block.caption}
          onChange={(e) => updateBlock(block.id, { caption: e.target.value })}
          className="h-9 text-sm"
          placeholder={t('Optional caption...')}
        />
      </div>
    </>
  );
}

// Important Update Block Editor
function ImportantUpdateBlockEditor({ 
  block, 
  updateBlock 
}: { 
  block: ImportantUpdateBlock;
  updateBlock: <T extends AdvertorialBlock>(id: string, updates: Partial<T>) => void;
}) {
  const t = useT();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const badgeInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateBlock(block.id, { imageSrc: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBadgeUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newBadges = [...block.trustBadges, { src: reader.result as string, label: 'Badge' }];
        updateBlock(block.id, { trustBadges: newBadges });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateBadgeLabel = (index: number, label: string) => {
    const newBadges = [...block.trustBadges];
    newBadges[index] = { ...newBadges[index], label };
    updateBlock(block.id, { trustBadges: newBadges });
  };

  const handleRemoveBadge = (index: number) => {
    const newBadges = block.trustBadges.filter((_, i) => i !== index);
    updateBlock(block.id, { trustBadges: newBadges });
  };

  return (
    <>
      {/* Headline */}
      <div className="space-y-1.5">
        <Label className="text-xs">{t('Headline')}</Label>
        <Input
          value={block.headline}
          onChange={(e) => updateBlock(block.id, { headline: e.target.value })}
          className="h-9 text-sm"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">{t('Headline Color')}</Label>
        <div className="flex gap-2">
          <input
            type="color"
            value={block.headlineColor}
            onChange={(e) => updateBlock(block.id, { headlineColor: e.target.value })}
            className="w-10 h-9 rounded-md border border-input cursor-pointer"
          />
          <Input
            value={block.headlineColor}
            onChange={(e) => updateBlock(block.id, { headlineColor: e.target.value })}
            className="h-9 text-sm font-mono flex-1"
          />
        </div>
      </div>

      {/* Content (Rich Text) */}
      <div className="space-y-1.5">
        <Label className="text-xs">{t('Text Content')}</Label>
        <RichTextEditor
          value={block.content}
          onChange={(html) => updateBlock(block.id, { content: html })}
          placeholder={t('Type your content here...')}
          minHeight="120px"
        />
      </div>

      {/* Image */}
      <div className="space-y-2">
        <Label className="text-xs">{t('Product Image')}</Label>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full h-9 text-sm"
          onClick={() => imageInputRef.current?.click()}
        >
          <Upload className="w-4 h-4 mr-2" />
          {t('Upload Image')}
        </Button>
        {block.imageSrc && (
          <div className="mt-2 rounded-md border border-border overflow-hidden">
            <img src={block.imageSrc} alt={t('Preview')} className="w-full h-24 object-cover" />
          </div>
        )}
      </div>

      {/* Trust Badges */}
      <div className="space-y-2 pt-2 border-t border-border">
        <div className="flex items-center justify-between">
          <Label className="text-xs">{t('Trust Badges')}</Label>
          <input
            ref={badgeInputRef}
            type="file"
            accept="image/*"
            onChange={handleBadgeUpload}
            className="hidden"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => badgeInputRef.current?.click()}
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            {t('Add Badge')}
          </Button>
        </div>
        {block.trustBadges.map((badge, index) => (
          <div key={index} className="flex items-center gap-2">
            <img src={badge.src} alt={badge.label} className="w-10 h-10 object-contain flex-shrink-0 rounded" />
            <Input
              value={badge.label}
              onChange={(e) => handleUpdateBadgeLabel(index, e.target.value)}
              placeholder={t('Badge label')}
              className="h-8 text-sm flex-1"
            />
            <Button aria-label={t('Remove badge')}
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
              onClick={() => handleRemoveBadge(index)}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        ))}
      </div>

      {/* Button */}
      <div className="space-y-2 pt-2 border-t border-border">
        <Label className="text-xs font-medium">{t('Button')}</Label>
        <div className="space-y-1.5">
          <Label className="text-xs">{t('Button Text')}</Label>
          <Input
            value={block.buttonText}
            onChange={(e) => updateBlock(block.id, { buttonText: e.target.value })}
            className="h-9 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">{t('Button URL')}</Label>
          <Input
            value={block.buttonUrl}
            onChange={(e) => updateBlock(block.id, { buttonUrl: e.target.value })}
            placeholder="https://..."
            className="h-9 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">{t('Button Color')}</Label>
          <div className="flex gap-2">
            <input
              type="color"
              value={block.buttonColor}
              onChange={(e) => updateBlock(block.id, { buttonColor: e.target.value })}
              className="w-10 h-9 rounded-md border border-input cursor-pointer"
            />
            <Input
              value={block.buttonColor}
              onChange={(e) => updateBlock(block.id, { buttonColor: e.target.value })}
              className="h-9 text-sm font-mono flex-1"
            />
          </div>
        </div>
      </div>

      {/* Background Color */}
      <div className="space-y-1.5 pt-2 border-t border-border">
        <Label className="text-xs">{t('Background Color')}</Label>
        <div className="flex gap-2">
          <input
            type="color"
            value={block.backgroundColor}
            onChange={(e) => updateBlock(block.id, { backgroundColor: e.target.value })}
            className="w-10 h-9 rounded-md border border-input cursor-pointer"
          />
          <Input
            value={block.backgroundColor}
            onChange={(e) => updateBlock(block.id, { backgroundColor: e.target.value })}
            className="h-9 text-sm font-mono flex-1"
          />
        </div>
      </div>
    </>
  );
}
