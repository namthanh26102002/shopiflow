// Right-hand panel: the settings of whatever is selected — a section, a block,
// or the theme-wide settings (colors, fonts, layout).
import React, { useMemo } from 'react';
import { ArrowLeft, Eye, EyeOff, MousePointerClick, Palette, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useThemeEditor } from '@/contexts/ThemeEditorContext';
import { SECTION_SCHEMAS, THEME_SETTINGS_SCHEMA } from '@/lib/shopifyTheme/themeSource';
import {
  getSection,
  isValueSetting,
  removeBlock,
  removeSection,
  restoreBlock,
  restoreSection,
  setBlockDisabled,
  setSectionDisabled,
  settingDefaults,
  updateBlockSetting,
  updateSectionSetting,
  updateThemeSetting,
} from '@/lib/shopifyTheme/state';
import type { SectionRef, SettingDef, SettingsMap, ThemeData } from '@/lib/shopifyTheme/types';
import { SettingField, type SchemeChoice } from './SettingField';

const schemeChoices = (data: ThemeData): SchemeChoice[] => {
  const schemes = (data.settings.color_schemes ?? {}) as Record<string, { settings?: Record<string, string> }>;
  return Object.entries(schemes).map(([id, scheme], i) => ({
    id,
    background: scheme.settings?.background ?? '#ffffff',
    text: scheme.settings?.text ?? '#000000',
    label: `Scheme ${i + 1}`,
  }));
};

const SettingsList: React.FC<{
  defs: SettingDef[];
  values: SettingsMap;
  onChange: (id: string, value: unknown) => void;
  schemes: SchemeChoice[];
  idPrefix: string;
}> = ({ defs, values, onChange, schemes, idPrefix }) => {
  const merged = { ...settingDefaults(defs), ...values };
  return (
    <div className="space-y-4">
      {defs.map((def, i) => (
        <SettingField
          // Remount per setting so rich text resets when the selection changes.
          key={`${idPrefix}-${def.id ?? `${def.type}-${i}`}`}
          def={def}
          value={isValueSetting(def) ? merged[def.id] : undefined}
          onChange={(value) => def.id && onChange(def.id, value)}
          schemes={schemes}
          idPrefix={idPrefix}
        />
      ))}
    </div>
  );
};

const PanelHeader: React.FC<{ title: string; subtitle?: string; onBack?: () => void; actions?: React.ReactNode }> = ({ title, subtitle, onBack, actions }) => (
  <div className="flex items-start gap-2 border-b border-border px-4 py-3">
    {onBack && (
      <Button variant="ghost" size="icon" className="-ml-2 h-7 w-7 shrink-0" onClick={onBack} aria-label="Back">
        <ArrowLeft className="h-4 w-4" />
      </Button>
    )}
    <div className="min-w-0 flex-1">
      <h2 className="truncate text-sm font-semibold text-foreground">{title}</h2>
      {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
    </div>
    {actions}
  </div>
);

/** Theme-wide settings, grouped as in settings_schema.json. */
const ThemeSettings: React.FC = () => {
  const { data, edit } = useThemeEditor();
  const groups = THEME_SETTINGS_SCHEMA.filter((group) => group.name !== 'theme_info' && (group.settings?.length ?? 0) > 0);
  const schemes = schemeChoices(data);

  return (
    <Accordion type="multiple" defaultValue={[groups[0]?.name ?? '']} className="px-4">
      {groups.map((group) => (
        <AccordionItem key={group.name} value={group.name}>
          <AccordionTrigger className="py-3 text-sm">{group.name}</AccordionTrigger>
          <AccordionContent className="pb-5">
            <div className="space-y-4">
              {(group.settings ?? []).map((def, i) =>
                def.type === 'color_scheme_group' && def.id ? (
                  <ColorSchemesEditor key={def.id} def={def} />
                ) : (
                  <SettingField
                    key={def.id ?? `${def.type}-${i}`}
                    def={def}
                    value={isValueSetting(def) ? (data.settings[def.id] ?? def.default) : undefined}
                    onChange={(value) => def.id && edit((d) => updateThemeSetting(d, def.id!, value))}
                    schemes={schemes}
                    idPrefix={`theme-${group.name}`}
                  />
                ),
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
};

const ColorSchemesEditor: React.FC<{ def: SettingDef }> = ({ def }) => {
  const { data, edit } = useThemeEditor();
  const schemes = (data.settings[def.id!] ?? {}) as Record<string, { settings?: SettingsMap }>;
  const fields = (def.definition ?? []).filter(isValueSetting);

  const update = (schemeId: string, id: string, value: unknown) =>
    edit((d) => {
      const all = structuredClone((d.settings[def.id!] ?? {}) as Record<string, { settings?: SettingsMap }>);
      all[schemeId] = { ...all[schemeId], settings: { ...all[schemeId]?.settings, [id]: value as SettingsMap[string] } };
      return updateThemeSetting(d, def.id!, all);
    });

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Sections pick one of these schemes. Changing a scheme changes every section using it.</p>
      <Accordion type="single" collapsible>
        {Object.entries(schemes).map(([schemeId, scheme], i) => {
          const s = { ...settingDefaults(fields), ...scheme.settings } as Record<string, string>;
          return (
            <AccordionItem key={schemeId} value={schemeId} className="border-b-0">
              <AccordionTrigger className="py-2 text-sm hover:no-underline">
                <span className="flex items-center gap-2">
                  <span
                    className="flex h-7 w-10 items-center justify-center rounded border border-border text-xs font-semibold"
                    style={{ background: s.background, color: s.text }}
                  >
                    Aa
                  </span>
                  Scheme {i + 1}
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 pb-4 pl-1">
                {fields.map((field) => (
                  <SettingField
                    key={field.id}
                    def={field}
                    value={s[field.id]}
                    onChange={(value) => update(schemeId, field.id, value)}
                    idPrefix={`scheme-${schemeId}`}
                  />
                ))}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
};

export const ThemeSettingsPanel: React.FC = () => {
  const { data, edit, selection, select } = useThemeEditor();
  const schemes = useMemo(() => schemeChoices(data), [data]);

  if (!selection) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
        <MousePointerClick className="h-6 w-6 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium text-foreground">Select a section to edit it</p>
          <p className="mt-1 text-xs text-muted-foreground">Click it in the preview or in the list on the left.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => select({ kind: 'theme-settings' })}>
          <Palette className="mr-1.5 h-3.5 w-3.5" />
          Theme settings
        </Button>
      </div>
    );
  }

  if (selection.kind === 'theme-settings') {
    return (
      <div className="flex h-full flex-col">
        <PanelHeader title="Theme settings" subtitle="Colors, fonts and layout for every page" onBack={() => select(null)} />
        <ScrollArea className="flex-1">
          <ThemeSettings />
        </ScrollArea>
      </div>
    );
  }

  const ref: SectionRef = selection.ref;
  const section = getSection(data, ref);
  const schema = section ? SECTION_SCHEMAS[section.type] : undefined;
  if (!section) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        That section no longer exists.{' '}
        <button type="button" className="underline" onClick={() => select(null)}>
          Back
        </button>
      </div>
    );
  }

  const hint = { kind: 'section' as const, ref };

  if (selection.kind === 'block') {
    const blockKey = selection.blockKey;
    const block = section.blocks?.[blockKey];
    const blockDef = schema?.blocks?.find((def) => def.type === block?.type);
    if (!block) {
      return (
        <div className="p-6 text-sm text-muted-foreground">
          That block no longer exists.{' '}
          <button type="button" className="underline" onClick={() => select({ kind: 'section', ref })}>
            Back to section
          </button>
        </div>
      );
    }
    const remove = () => {
      const index = (section.block_order ?? []).indexOf(blockKey);
      edit((d) => removeBlock(d, ref, blockKey), hint);
      select({ kind: 'section', ref });
      toast('Block removed', {
        action: { label: 'Undo', onClick: () => edit((d) => restoreBlock(d, ref, blockKey, block, index), hint) },
      });
    };
    return (
      <div className="flex h-full flex-col">
        <PanelHeader
          title={blockDef?.name ?? block.type}
          subtitle={schema?.name}
          onBack={() => select({ kind: 'section', ref })}
          actions={
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              title={block.disabled ? 'Show block' : 'Hide block'}
              onClick={() => edit((d) => setBlockDisabled(d, ref, blockKey, !block.disabled), hint)}
            >
              {block.disabled ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          }
        />
        <ScrollArea className="flex-1">
          <div className="space-y-6 p-4">
            {(blockDef?.settings?.length ?? 0) === 0 ? (
              <p className="text-xs text-muted-foreground">This block has no settings.</p>
            ) : (
              <SettingsList
                defs={blockDef!.settings!}
                values={block.settings ?? {}}
                onChange={(id, value) => edit((d) => updateBlockSetting(d, ref, blockKey, id, value), hint)}
                schemes={schemes}
                idPrefix={`block-${blockKey}`}
              />
            )}
            <Button variant="outline" size="sm" className="w-full text-destructive hover:text-destructive" onClick={remove}>
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Remove block
            </Button>
          </div>
        </ScrollArea>
      </div>
    );
  }

  const removeThisSection = () => {
    const container = ref.scope === 'template' ? data.templates[ref.container] : data.groups[ref.container];
    const index = container?.order.indexOf(ref.key) ?? 0;
    edit((d) => removeSection(d, ref));
    select(null);
    toast('Section removed', {
      action: { label: 'Undo', onClick: () => edit((d) => restoreSection(d, ref, section, index)) },
    });
  };

  return (
    <div className="flex h-full flex-col">
      <PanelHeader
        title={schema?.name ?? section.type}
        subtitle={section.disabled ? 'Hidden' : undefined}
        onBack={() => select(null)}
        actions={
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title={section.disabled ? 'Show section' : 'Hide section'}
            onClick={() => edit((d) => setSectionDisabled(d, ref, !section.disabled))}
          >
            {section.disabled ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        }
      />
      <ScrollArea className="flex-1">
        <div className="space-y-6 p-4">
          {(schema?.settings?.length ?? 0) === 0 ? (
            <p className="text-xs text-muted-foreground">This section has no settings.</p>
          ) : (
            <SettingsList
              defs={schema!.settings!}
              values={section.settings ?? {}}
              onChange={(id, value) => edit((d) => updateSectionSetting(d, ref, id, value), hint)}
              schemes={schemes}
              idPrefix={`section-${ref.key}`}
            />
          )}
          <Button variant="outline" size="sm" className="w-full text-destructive hover:text-destructive" onClick={removeThisSection}>
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Remove section
          </Button>
        </div>
      </ScrollArea>
    </div>
  );
};
