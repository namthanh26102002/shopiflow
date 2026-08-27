// Optional content blocks for the Blank page type: projection bars, phase timeline, feature grid
import React from 'react';
import { Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import {
  Question,
  ProjectionBar,
  TimelinePhase,
  FeatureCard,
  BeforeAfterRow,
  generateId,
  createDefaultProjectionBars,
  createDefaultPhaseTimeline,
  createDefaultFeatureGrid,
} from '@/types/quiz';
import { useQuiz } from '@/contexts/QuizContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { IconPicker } from './IconPicker';

const ColorInput: React.FC<{ label: string; value: string; onChange: (v: string) => void }> = ({ label, value, onChange }) => (
  <div className="flex items-center gap-2">
    <Label className="text-xs text-muted-foreground flex-1">{label}</Label>
    <input
      type="color"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-8 h-8 rounded border border-border-subtle cursor-pointer bg-transparent"
    />
  </div>
);

const SectionToggle: React.FC<{
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}> = ({ title, description, checked, onCheckedChange }) => (
  <div className="flex items-center justify-between py-2">
    <div>
      <Label className="text-sm font-medium text-foreground">{title}</Label>
      <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
    </div>
    <Switch checked={checked} onCheckedChange={onCheckedChange} />
  </div>
);

const move = <T,>(arr: T[], index: number, dir: -1 | 1): T[] => {
  const next = [...arr];
  const target = index + dir;
  if (target < 0 || target >= next.length) return next;
  [next[index], next[target]] = [next[target], next[index]];
  return next;
};

const RowHeader: React.FC<{
  label: string;
  index: number;
  total: number;
  onMove: (dir: -1 | 1) => void;
  onDelete?: () => void;
}> = ({ label, index, total, onMove, onDelete }) => (
  <div className="flex items-center justify-between">
    <span className="text-xs font-medium text-muted-foreground">{label}</span>
    <div className="flex items-center gap-0.5">
      <button
        onClick={() => onMove(-1)}
        disabled={index === 0}
        className="p-1 rounded hover:bg-secondary disabled:opacity-30 text-muted-foreground"
      >
        <ChevronUp className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => onMove(1)}
        disabled={index === total - 1}
        className="p-1 rounded hover:bg-secondary disabled:opacity-30 text-muted-foreground"
      >
        <ChevronDown className="w-3.5 h-3.5" />
      </button>
      {onDelete && (
        <button onClick={onDelete} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  </div>
);

export const BlankBlocksEditor: React.FC<{ question: Question }> = ({ question }) => {
  const { updateQuestion } = useQuiz();
  const pb = question.projectionBarsConfig;
  const pt = question.phaseTimelineConfig;
  const fg = question.featureGridConfig;

  const setPb = (updates: Partial<NonNullable<typeof pb>>) =>
    updateQuestion(question.id, { projectionBarsConfig: { ...pb!, ...updates } });
  const setPbBars = (bars: ProjectionBar[]) => setPb({ bars });

  const setPt = (updates: Partial<NonNullable<typeof pt>>) =>
    updateQuestion(question.id, { phaseTimelineConfig: { ...pt!, ...updates } });
  const setPhases = (phases: TimelinePhase[]) => setPt({ phases });

  const setFg = (updates: Partial<NonNullable<typeof fg>>) =>
    updateQuestion(question.id, { featureGridConfig: { ...fg!, ...updates } });
  const setCards = (cards: FeatureCard[]) => setFg({ cards });
  const setBa = (updates: Partial<NonNullable<typeof fg>['beforeAfter']>) =>
    setFg({ beforeAfter: { ...fg!.beforeAfter, ...updates } });
  const setBaRows = (rows: BeforeAfterRow[]) => setBa({ rows });

  return (
    <div className="space-y-5">
      {/* ---------- Projection Bars ---------- */}
      <div className="space-y-3 border-t border-border-subtle pt-3">
        <SectionToggle
          title="Projection Bars"
          description="Bar chart showing progress over time"
          checked={!!pb}
          onCheckedChange={(checked) =>
            updateQuestion(question.id, { projectionBarsConfig: checked ? createDefaultProjectionBars() : undefined })
          }
        />

        {pb && (
          <div className="space-y-3">
            <Input value={pb.title} onChange={(e) => setPb({ title: e.target.value })} placeholder="Title" className="input-clean" />

            <div className="flex items-center gap-2">
              <Switch checked={pb.showBadge} onCheckedChange={(v) => setPb({ showBadge: v })} />
              <Input
                value={pb.badgeText}
                onChange={(e) => setPb({ badgeText: e.target.value })}
                placeholder="Badge text"
                className="input-clean flex-1"
                disabled={!pb.showBadge}
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Input value={pb.axisHighLabel} onChange={(e) => setPb({ axisHighLabel: e.target.value })} placeholder="High" className="input-clean text-xs" />
              <Input value={pb.axisMidLabel} onChange={(e) => setPb({ axisMidLabel: e.target.value })} placeholder="Med" className="input-clean text-xs" />
              <Input value={pb.axisLowLabel} onChange={(e) => setPb({ axisLowLabel: e.target.value })} placeholder="Low" className="input-clean text-xs" />
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={pb.showFootnote} onCheckedChange={(v) => setPb({ showFootnote: v })} />
              <Input
                value={pb.footnoteText}
                onChange={(e) => setPb({ footnoteText: e.target.value })}
                placeholder="Footnote"
                className="input-clean flex-1"
                disabled={!pb.showFootnote}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <ColorInput label="Bar bottom" value={pb.gradientFrom} onChange={(v) => setPb({ gradientFrom: v })} />
              <ColorInput label="Bar top" value={pb.gradientTo} onChange={(v) => setPb({ gradientTo: v })} />
            </div>

            {pb.bars.map((bar, idx) => (
              <div key={bar.id} className="card-elevated p-3 space-y-2">
                <RowHeader
                  label={`Bar ${idx + 1}`}
                  index={idx}
                  total={pb.bars.length}
                  onMove={(dir) => setPbBars(move(pb.bars, idx, dir))}
                  onDelete={pb.bars.length > 1 ? () => setPbBars(pb.bars.filter((b) => b.id !== bar.id)) : undefined}
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    value={bar.label}
                    onChange={(e) => setPbBars(pb.bars.map((b) => (b.id === bar.id ? { ...b, label: e.target.value } : b)))}
                    placeholder="Label"
                    className="input-clean text-xs"
                  />
                  <Input
                    value={bar.value}
                    onChange={(e) => setPbBars(pb.bars.map((b) => (b.id === bar.id ? { ...b, value: e.target.value } : b)))}
                    placeholder="Value"
                    className="input-clean text-xs"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground w-16">Fill {bar.fill}%</Label>
                  <Slider
                    value={[bar.fill]}
                    min={0}
                    max={100}
                    step={1}
                    onValueChange={([v]) => setPbBars(pb.bars.map((b) => (b.id === bar.id ? { ...b, fill: v } : b)))}
                    className="flex-1"
                  />
                </div>
                <ColorInput
                  label="Value color"
                  value={bar.valueColor || '#1A1A1A'}
                  onChange={(v) => setPbBars(pb.bars.map((b) => (b.id === bar.id ? { ...b, valueColor: v } : b)))}
                />
              </div>
            ))}

            {pb.bars.length < 4 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPbBars([...pb.bars, { id: generateId(), label: `Month ${pb.bars.length + 1}`, value: '50%', fill: 50 }])}
                className="text-primary hover:text-primary hover:bg-primary-light h-8 text-sm w-full"
              >
                <Plus className="w-4 h-4 mr-1" /> Add Bar
              </Button>
            )}
          </div>
        )}
      </div>

      {/* ---------- Phase Timeline ---------- */}
      <div className="space-y-3 border-t border-border-subtle pt-3">
        <SectionToggle
          title="Phase Timeline"
          description="Vertical timeline with phases and progress"
          checked={!!pt}
          onCheckedChange={(checked) =>
            updateQuestion(question.id, { phaseTimelineConfig: checked ? createDefaultPhaseTimeline() : undefined })
          }
        />

        {pt && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <IconPicker value={pt.headingIconSvg} onChange={(svg) => setPt({ headingIconSvg: svg })} />
              <Input value={pt.heading} onChange={(e) => setPt({ heading: e.target.value })} placeholder="Heading" className="input-clean flex-1" />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <ColorInput label="Progress start" value={pt.gradientFrom} onChange={(v) => setPt({ gradientFrom: v })} />
              <ColorInput label="Progress end" value={pt.gradientTo} onChange={(v) => setPt({ gradientTo: v })} />
            </div>

            {pt.phases.map((phase, idx) => (
              <div key={phase.id} className="card-elevated p-3 space-y-2">
                <RowHeader
                  label={`Phase ${idx + 1}`}
                  index={idx}
                  total={pt.phases.length}
                  onMove={(dir) => setPhases(move(pt.phases, idx, dir))}
                  onDelete={pt.phases.length > 1 ? () => setPhases(pt.phases.filter((p) => p.id !== phase.id)) : undefined}
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    value={phase.rangeLabel}
                    onChange={(e) => setPhases(pt.phases.map((p) => (p.id === phase.id ? { ...p, rangeLabel: e.target.value } : p)))}
                    placeholder="Weeks 1-3"
                    className="input-clean text-xs"
                  />
                  <Input
                    value={phase.badgeText}
                    onChange={(e) => setPhases(pt.phases.map((p) => (p.id === phase.id ? { ...p, badgeText: e.target.value } : p)))}
                    placeholder="25%"
                    className="input-clean text-xs"
                  />
                </div>
                <Input
                  value={phase.title}
                  onChange={(e) => setPhases(pt.phases.map((p) => (p.id === phase.id ? { ...p, title: e.target.value } : p)))}
                  placeholder="Title"
                  className="input-clean"
                />
                <Input
                  value={phase.description}
                  onChange={(e) => setPhases(pt.phases.map((p) => (p.id === phase.id ? { ...p, description: e.target.value } : p)))}
                  placeholder="Description"
                  className="input-clean text-xs"
                />
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground w-20">Fill {phase.progress}%</Label>
                  <Slider
                    value={[phase.progress]}
                    min={0}
                    max={100}
                    step={1}
                    onValueChange={([v]) => setPhases(pt.phases.map((p) => (p.id === phase.id ? { ...p, progress: v } : p)))}
                    className="flex-1"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <ColorInput
                    label="Dot"
                    value={phase.dotColor}
                    onChange={(v) => setPhases(pt.phases.map((p) => (p.id === phase.id ? { ...p, dotColor: v } : p)))}
                  />
                  <ColorInput
                    label="Badge"
                    value={phase.badgeColor}
                    onChange={(v) => setPhases(pt.phases.map((p) => (p.id === phase.id ? { ...p, badgeColor: v } : p)))}
                  />
                </div>
              </div>
            ))}

            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setPhases([
                  ...pt.phases,
                  { id: generateId(), rangeLabel: '', title: '', description: '', badgeText: '', badgeColor: pt.gradientTo, progress: 50, dotColor: pt.gradientFrom },
                ])
              }
              className="text-primary hover:text-primary hover:bg-primary-light h-8 text-sm w-full"
            >
              <Plus className="w-4 h-4 mr-1" /> Add Phase
            </Button>
          </div>
        )}
      </div>

      {/* ---------- Feature Grid + Before/After ---------- */}
      <div className="space-y-3 border-t border-border-subtle pt-3">
        <SectionToggle
          title="Feature Grid & Before/After"
          description="Icon cards grid plus a comparison list"
          checked={!!fg}
          onCheckedChange={(checked) =>
            updateQuestion(question.id, { featureGridConfig: checked ? createDefaultFeatureGrid() : undefined })
          }
        />

        {fg && (
          <div className="space-y-4">
            {/* Feature grid */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-foreground">Feature cards</Label>
                <Switch checked={fg.showGrid} onCheckedChange={(v) => setFg({ showGrid: v })} />
              </div>

              {fg.showGrid && (
                <>
                  <div className="flex items-center gap-2">
                    <IconPicker value={fg.headingIconSvg} onChange={(svg) => setFg({ headingIconSvg: svg })} />
                    <Input value={fg.heading} onChange={(e) => setFg({ heading: e.target.value })} placeholder="Heading" className="input-clean flex-1" />
                  </div>

                  {fg.cards.map((card, idx) => (
                    <div key={card.id} className="card-elevated p-3 space-y-2">
                      <RowHeader
                        label={`Card ${idx + 1}`}
                        index={idx}
                        total={fg.cards.length}
                        onMove={(dir) => setCards(move(fg.cards, idx, dir))}
                        onDelete={fg.cards.length > 1 ? () => setCards(fg.cards.filter((c) => c.id !== card.id)) : undefined}
                      />
                      <div className="flex items-center gap-2">
                        <IconPicker
                          value={card.iconSvg}
                          onChange={(svg) => setCards(fg.cards.map((c) => (c.id === card.id ? { ...c, iconSvg: svg } : c)))}
                        />
                        <Input
                          value={card.title}
                          onChange={(e) => setCards(fg.cards.map((c) => (c.id === card.id ? { ...c, title: e.target.value } : c)))}
                          placeholder="Title"
                          className="input-clean flex-1"
                        />
                      </div>
                      <Input
                        value={card.description}
                        onChange={(e) => setCards(fg.cards.map((c) => (c.id === card.id ? { ...c, description: e.target.value } : c)))}
                        placeholder="Description"
                        className="input-clean text-xs"
                      />
                      <ColorInput
                        label="Icon color"
                        value={card.iconColor}
                        onChange={(v) => setCards(fg.cards.map((c) => (c.id === card.id ? { ...c, iconColor: v } : c)))}
                      />
                    </div>
                  ))}

                  {fg.cards.length < 6 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCards([...fg.cards, { id: generateId(), iconColor: '#7C3AED', title: '', description: '' }])}
                      className="text-primary hover:text-primary hover:bg-primary-light h-8 text-sm w-full"
                    >
                      <Plus className="w-4 h-4 mr-1" /> Add Card
                    </Button>
                  )}
                </>
              )}
            </div>

            {/* Before / After */}
            <div className="space-y-3 border-t border-border-subtle pt-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-foreground">Before / After</Label>
                <Switch checked={fg.beforeAfter.enabled} onCheckedChange={(v) => setBa({ enabled: v })} />
              </div>

              {fg.beforeAfter.enabled && (
                <>
                  <div className="flex items-center gap-2">
                    <IconPicker value={fg.beforeAfter.headingIconSvg} onChange={(svg) => setBa({ headingIconSvg: svg })} />
                    <Input
                      value={fg.beforeAfter.heading}
                      onChange={(e) => setBa({ heading: e.target.value })}
                      placeholder="Heading"
                      className="input-clean flex-1"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Input value={fg.beforeAfter.beforeLabel} onChange={(e) => setBa({ beforeLabel: e.target.value })} placeholder="BEFORE" className="input-clean text-xs" />
                    <Input value={fg.beforeAfter.afterLabel} onChange={(e) => setBa({ afterLabel: e.target.value })} placeholder="AFTER" className="input-clean text-xs" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <ColorInput label="Before color" value={fg.beforeAfter.beforeColor} onChange={(v) => setBa({ beforeColor: v })} />
                    <ColorInput label="After color" value={fg.beforeAfter.afterColor} onChange={(v) => setBa({ afterColor: v })} />
                  </div>

                  {fg.beforeAfter.rows.map((row, idx) => (
                    <div key={row.id} className="card-elevated p-3 space-y-2">
                      <RowHeader
                        label={`Row ${idx + 1}`}
                        index={idx}
                        total={fg.beforeAfter.rows.length}
                        onMove={(dir) => setBaRows(move(fg.beforeAfter.rows, idx, dir))}
                        onDelete={fg.beforeAfter.rows.length > 1 ? () => setBaRows(fg.beforeAfter.rows.filter((r) => r.id !== row.id)) : undefined}
                      />
                      <Input
                        value={row.beforeText}
                        onChange={(e) => setBaRows(fg.beforeAfter.rows.map((r) => (r.id === row.id ? { ...r, beforeText: e.target.value } : r)))}
                        placeholder="Before"
                        className="input-clean text-xs"
                      />
                      <Input
                        value={row.afterText}
                        onChange={(e) => setBaRows(fg.beforeAfter.rows.map((r) => (r.id === row.id ? { ...r, afterText: e.target.value } : r)))}
                        placeholder="After"
                        className="input-clean text-xs"
                      />
                    </div>
                  ))}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setBaRows([...fg.beforeAfter.rows, { id: generateId(), beforeText: '', afterText: '' }])}
                    className="text-primary hover:text-primary hover:bg-primary-light h-8 text-sm w-full"
                  >
                    <Plus className="w-4 h-4 mr-1" /> Add Row
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
