// Left-hand panel: the page's sections in order (header group, template,
// footer group), each with its blocks. Drag to reorder, eye to hide, + to add.
import React, { useMemo, useState } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronRight, Eye, EyeOff, GripVertical, Palette, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useThemeEditor } from '@/contexts/ThemeEditorContext';
import { SECTION_SCHEMAS } from '@/lib/shopifyTheme/themeSource';
import {
  addBlock,
  addSection,
  addableBlocks,
  addableSections,
  moveBlock,
  moveSection,
  setBlockDisabled,
  setSectionDisabled,
  uniqueKey,
} from '@/lib/shopifyTheme/state';
import type { BlockInstance, SectionInstance, SectionRef, SettingsMap } from '@/lib/shopifyTheme/types';
import { cn } from '@/lib/utils';

/** A short label from the block's own content, as Shopify's editor shows. */
const contentLabel = (settings: SettingsMap | undefined): string | null => {
  for (const key of ['heading', 'title', 'question', 'label', 'text', 'name', 'quote']) {
    const value = settings?.[key];
    if (typeof value === 'string' && value.trim()) {
      const plain = value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (plain) return plain.length > 40 ? `${plain.slice(0, 40)}…` : plain;
    }
  }
  return null;
};

const useListSensors = () =>
  useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

const SortableRow: React.FC<{
  id: string;
  depth: 0 | 1;
  selected: boolean;
  hidden: boolean;
  label: string;
  expandable?: boolean;
  expanded?: boolean;
  onToggleExpand?: () => void;
  onSelect: () => void;
  onToggleHidden: () => void;
}> = ({ id, depth, selected, hidden, label, expandable, expanded, onToggleExpand, onSelect, onToggleHidden }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'group flex h-8 items-center gap-0.5 rounded-md pr-1 text-sm',
        depth === 1 && 'ml-5',
        selected ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-secondary',
        isDragging && 'relative z-10 bg-card shadow-md',
      )}
    >
      <button
        type="button"
        className="flex h-7 w-5 shrink-0 cursor-grab items-center justify-center text-muted-foreground opacity-0 group-hover:opacity-100 focus-visible:opacity-100 active:cursor-grabbing"
        aria-label={`Reorder ${label}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      {depth === 0 &&
        (expandable ? (
          <button type="button" onClick={onToggleExpand} className="flex h-6 w-5 shrink-0 items-center justify-center text-muted-foreground" aria-label={expanded ? 'Collapse' : 'Expand'} aria-expanded={expanded}>
            <ChevronRight className={cn('h-3.5 w-3.5 transition-transform', expanded && 'rotate-90')} />
          </button>
        ) : (
          <span className="w-5 shrink-0" />
        ))}
      <button type="button" onClick={onSelect} className={cn('min-w-0 flex-1 truncate text-left', hidden && 'text-muted-foreground line-through decoration-muted-foreground/40')}>
        {label}
      </button>
      <button
        type="button"
        onClick={onToggleHidden}
        className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-foreground', !hidden && 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100')}
        aria-label={hidden ? `Show ${label}` : `Hide ${label}`}
        title={hidden ? 'Show' : 'Hide'}
      >
        {hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
};

const AddMenu: React.FC<{
  label: string;
  items: Array<{ key: string; name: string }>;
  onPick: (key: string) => void;
  indent?: boolean;
}> = ({ label, items, onPick, indent }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const shown = items.filter((item) => item.name.toLowerCase().includes(query.toLowerCase()));
  if (items.length === 0) return null;
  return (
    <Popover open={open} onOpenChange={(next) => { setOpen(next); if (!next) setQuery(''); }}>
      <PopoverTrigger asChild>
        <button type="button" className={cn('flex h-8 w-full items-center gap-1.5 rounded-md px-2 text-sm text-primary hover:bg-primary/5', indent ? 'pl-12' : 'pl-7')}>
          <Plus className="h-3.5 w-3.5" />
          {label}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" side="right" className="w-64 p-2">
        {items.length > 8 && (
          <div className="relative mb-2">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" className="h-8 pl-7 text-sm" />
          </div>
        )}
        <div className="max-h-72 overflow-y-auto">
          {shown.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                onPick(item.key);
                setOpen(false);
                setQuery('');
              }}
              className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-secondary"
            >
              {item.name}
            </button>
          ))}
          {shown.length === 0 && <p className="px-2 py-1.5 text-xs text-muted-foreground">Nothing matches.</p>}
        </div>
      </PopoverContent>
    </Popover>
  );
};

const BlockList: React.FC<{ sectionRef: SectionRef; section: SectionInstance }> = ({ sectionRef, section }) => {
  const { edit, selection, select } = useThemeEditor();
  const sensors = useListSensors();
  const schema = SECTION_SCHEMAS[section.type];
  const order = section.block_order ?? [];
  const hint = { kind: 'section' as const, ref: sectionRef };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = order.indexOf(String(active.id));
    const to = order.indexOf(String(over.id));
    if (from >= 0 && to >= 0) edit((d) => moveBlock(d, sectionRef, from, to), hint);
  };

  const blockName = (block: BlockInstance) => schema?.blocks?.find((def) => def.type === block.type)?.name ?? block.type;

  return (
    <div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          {order.map((key) => {
            const block = section.blocks?.[key];
            if (!block) return null;
            const isSelected =
              selection?.kind === 'block' &&
              selection.blockKey === key &&
              selection.ref.key === sectionRef.key &&
              selection.ref.container === sectionRef.container;
            return (
              <SortableRow
                key={key}
                id={key}
                depth={1}
                selected={isSelected}
                hidden={!!block.disabled}
                label={contentLabel(block.settings) ?? blockName(block)}
                onSelect={() => select({ kind: 'block', ref: sectionRef, blockKey: key })}
                onToggleHidden={() => edit((d) => setBlockDisabled(d, sectionRef, key, !block.disabled), hint)}
              />
            );
          })}
        </SortableContext>
      </DndContext>
      <AddMenu
        label="Add block"
        indent
        items={addableBlocks(schema, section).map((def) => ({ key: def.type, name: def.name }))}
        onPick={(type) => {
          const def = schema?.blocks?.find((b) => b.type === type);
          if (!def) return;
          // Pick the key now so the new block can be selected straight away.
          const key = uniqueKey(def.type, Object.keys(section.blocks ?? {}));
          edit((d) => addBlock(d, sectionRef, def, key).data, hint);
          select({ kind: 'block', ref: sectionRef, blockKey: key });
        }}
      />
    </div>
  );
};

const ContainerList: React.FC<{ scope: SectionRef['scope']; name: string; title: string }> = ({ scope, name, title }) => {
  const { data, edit, selection, select } = useThemeEditor();
  const sensors = useListSensors();
  const container = scope === 'template' ? data.templates[name] : data.groups[name];
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Open the section holding the selected block, so a click in the preview shows it.
  const selectedKey = selection && selection.kind !== 'theme-settings' && selection.ref.container === name ? selection.ref.key : null;
  const isExpanded = (key: string) => expanded[key] ?? (selection?.kind === 'block' && selectedKey === key);

  const addable = useMemo(() => addableSections(SECTION_SCHEMAS, data, scope, name), [data, scope, name]);
  if (!container) return null;

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = container.order.indexOf(String(active.id));
    const to = container.order.indexOf(String(over.id));
    if (from >= 0 && to >= 0) edit((d) => moveSection(d, scope, name, from, to));
  };

  return (
    <div className="py-2">
      <h3 className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={container.order} strategy={verticalListSortingStrategy}>
          {container.order.map((key) => {
            const section = container.sections[key];
            if (!section) return null;
            const ref: SectionRef = { scope, container: name, key };
            const schema = SECTION_SCHEMAS[section.type];
            const hasBlocks = (schema?.blocks?.length ?? 0) > 0;
            const open = hasBlocks && isExpanded(key);
            return (
              <div key={key}>
                <SortableRow
                  id={key}
                  depth={0}
                  selected={selection?.kind === 'section' && selectedKey === key}
                  hidden={!!section.disabled}
                  label={schema?.name ?? section.type}
                  expandable={hasBlocks}
                  expanded={open}
                  onToggleExpand={() => setExpanded((prev) => ({ ...prev, [key]: !open }))}
                  onSelect={() => {
                    select({ kind: 'section', ref });
                    if (hasBlocks) setExpanded((prev) => ({ ...prev, [key]: true }));
                  }}
                  onToggleHidden={() => edit((d) => setSectionDisabled(d, ref, !section.disabled))}
                />
                {open && <BlockList sectionRef={ref} section={section} />}
              </div>
            );
          })}
        </SortableContext>
      </DndContext>
      <AddMenu
        label="Add section"
        items={addable.map(({ type, schema }) => ({ key: type, name: schema.name }))}
        onPick={(type) => {
          const key = uniqueKey(type, Object.keys(container.sections));
          edit((d) => addSection(d, scope, name, type, SECTION_SCHEMAS[type], undefined, key).data);
          select({ kind: 'section', ref: { scope, container: name, key } });
        }}
      />
    </div>
  );
};

export const TEMPLATE_LABELS: Record<string, string> = {
  index: 'Home page',
  product: 'Product',
  collection: 'Collection',
  'list-collections': 'Collections list',
  page: 'Page',
  blog: 'Blog',
  article: 'Blog post',
  cart: 'Cart',
  search: 'Search',
  '404': '404 page',
  password: 'Password page',
};

export const templateLabel = (name: string) => {
  const [base, ...suffix] = name.split('.');
  const label = TEMPLATE_LABELS[base] ?? base;
  return suffix.length ? `${label} (${suffix.join('.')})` : label;
};

export const SectionTree: React.FC = () => {
  const { data, template, selection, select } = useThemeEditor();
  const groupsOnPage = template.startsWith('password') ? [] : ['header-group', 'footer-group'].filter((g) => data.groups[g]);

  return (
    <div className="flex h-full flex-col">
      <ScrollArea className="flex-1">
        <div className="px-2 py-1">
          {groupsOnPage.includes('header-group') && <ContainerList scope="group" name="header-group" title={data.groups['header-group']?.name ?? 'Header'} />}
          <ContainerList scope="template" name={template} title={templateLabel(template)} />
          {groupsOnPage.includes('footer-group') && <ContainerList scope="group" name="footer-group" title={data.groups['footer-group']?.name ?? 'Footer'} />}
        </div>
      </ScrollArea>
      <div className="border-t border-border p-2">
        <Button
          variant={selection?.kind === 'theme-settings' ? 'secondary' : 'ghost'}
          className="w-full justify-start gap-2 text-sm"
          onClick={() => select({ kind: 'theme-settings' })}
        >
          <Palette className="h-4 w-4" />
          Theme settings
        </Button>
      </div>
    </div>
  );
};
