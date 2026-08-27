import React, { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, Check, X, Clock } from 'lucide-react';
import { TimelineEvent } from '@/hooks/useOrders';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TIMELINE_TEMPLATES } from '@/constants/timelineTemplates';
import { format } from 'date-fns';

interface Props {
  events: TimelineEvent[];
  editable?: boolean;
  orderDate?: string;
  onAdd?: (desc: string, date: string) => void;
  onUpdate?: (id: string, desc: string, date: string) => void;
  onDelete?: (id: string) => void;
}

const toLocalDatetime = (iso: string) => {
  const d = new Date(iso);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
};

const CUSTOM_VALUE = '__custom__';

export const OrderTimeline: React.FC<Props> = ({ events, editable = false, orderDate, onAdd, onUpdate, onDelete }) => {
  const [selectedTemplate, setSelectedTemplate] = useState<string>(CUSTOM_VALUE);
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [customDesc, setCustomDesc] = useState('');
  const [newDate, setNewDate] = useState(() => toLocalDatetime(new Date().toISOString()));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDesc, setEditDesc] = useState('');
  const [editDate, setEditDate] = useState('');

  const isCustom = selectedTemplate === CUSTOM_VALUE;

  const activeTemplate = useMemo(() => {
    if (isCustom) return null;
    const idx = parseInt(selectedTemplate, 10);
    return TIMELINE_TEMPLATES[idx] ?? null;
  }, [selectedTemplate, isCustom]);

  const resolvedDescription = useMemo(() => {
    if (!activeTemplate) return customDesc;
    let result = activeTemplate.template;
    for (const v of activeTemplate.variables) {
      result = result.replace(`{${v}}`, variableValues[v]?.trim() || `{${v}}`);
    }
    return result;
  }, [activeTemplate, variableValues, customDesc]);

  const canAdd = useMemo(() => {
    if (!activeTemplate) return customDesc.trim().length > 0;
    if (activeTemplate.variables.length === 0) return true;
    return activeTemplate.variables.every((v) => variableValues[v]?.trim());
  }, [activeTemplate, variableValues, customDesc]);

  const handleAdd = () => {
    if (!canAdd || !onAdd) return;
    onAdd(resolvedDescription, new Date(newDate).toISOString());
    setCustomDesc('');
    setVariableValues({});
    setSelectedTemplate(CUSTOM_VALUE);
    setNewDate(toLocalDatetime(new Date().toISOString()));
  };

  const handleTemplateChange = (value: string) => {
    setSelectedTemplate(value);
    setVariableValues({});
    setCustomDesc('');
    if (value !== CUSTOM_VALUE) {
      const idx = parseInt(value, 10);
      const tmpl = TIMELINE_TEMPLATES[idx];
      if (tmpl && orderDate) {
        const base = new Date(orderDate).getTime();
        const suggested = new Date(base + tmpl.defaultDelayHours * 3600000);
        setNewDate(toLocalDatetime(suggested.toISOString()));
      }
    }
  };

  const startEdit = (e: TimelineEvent) => {
    setEditingId(e.id);
    setEditDesc(e.description);
    setEditDate(toLocalDatetime(e.event_date));
  };

  const saveEdit = () => {
    if (editingId && onUpdate) onUpdate(editingId, editDesc, new Date(editDate).toISOString());
    setEditingId(null);
  };

  const now = new Date();

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4">Order Timeline</h3>

      <div className="relative ml-3">
        {events.length > 0 && (
          <div className="absolute left-[5px] top-2 bottom-2 w-px bg-border" />
        )}
        <div className="space-y-4">
          {events.map((event) => {
            const isFuture = new Date(event.event_date) > now;
            return (
              <div key={event.id} className={`flex items-start gap-3 relative ${isFuture && editable ? 'opacity-60' : ''}`}>
                <div className={`w-[11px] h-[11px] rounded-full mt-1 shrink-0 z-10 ${
                  isFuture ? 'bg-muted-foreground/40 ring-2 ring-muted-foreground/20' :
                  event.status_marker === 'completed' ? 'bg-green-500' :
                  event.status_marker === 'warning' ? 'bg-yellow-500' :
                  'bg-blue-500'
                }`} />
                <div className="flex-1 min-w-0">
                  {editingId === event.id ? (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1">
                        <Input value={editDesc} onChange={e => setEditDesc(e.target.value)} className="h-7 text-xs" />
                        <Button variant="ghost" size="icon" className="w-6 h-6 text-green-600" onClick={saveEdit}><Check className="w-3 h-3" /></Button>
                        <Button variant="ghost" size="icon" className="w-6 h-6 text-muted-foreground" onClick={() => setEditingId(null)}><X className="w-3 h-3" /></Button>
                      </div>
                      <input type="datetime-local" value={editDate} onChange={e => setEditDate(e.target.value)} className="h-7 text-xs rounded-md border border-input bg-background px-2 text-muted-foreground" />
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm text-foreground">{event.description}</p>
                        {isFuture && editable && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                            <Clock className="w-2.5 h-2.5" /> Scheduled
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{format(new Date(event.event_date), 'MMM dd, yyyy · hh:mm a')}</p>
                    </>
                  )}
                </div>
                {editable && editingId !== event.id && (
                  <div className="flex gap-0.5 shrink-0">
                    <Button variant="ghost" size="icon" className="w-6 h-6 text-muted-foreground hover:text-foreground" onClick={() => startEdit(event)}>
                      <Pencil className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="w-6 h-6 text-destructive hover:text-destructive" onClick={() => onDelete?.(event.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {editable && (
        <div className="mt-4 pt-3 border-t border-border space-y-3">
          {/* Template selector */}
          <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Select a template..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={CUSTOM_VALUE}>Custom event</SelectItem>
              {TIMELINE_TEMPLATES.map((t, i) => (
                <SelectItem key={i} value={String(i)}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Variable inputs or custom text */}
          {activeTemplate ? (
            activeTemplate.variables.length > 0 && (
              <div className="space-y-2">
                {activeTemplate.variables.map((v) => (
                  <Input
                    key={v}
                    value={variableValues[v] || ''}
                    onChange={(e) => setVariableValues((prev) => ({ ...prev, [v]: e.target.value }))}
                    placeholder={v}
                    className="h-8 text-sm"
                    onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                  />
                ))}
              </div>
            )
          ) : (
            <Input
              value={customDesc}
              onChange={(e) => setCustomDesc(e.target.value)}
              placeholder="Add timeline event..."
              className="h-8 text-sm"
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
          )}

          {/* Preview */}
          {resolvedDescription && !resolvedDescription.includes('{') && (
            <p className="text-xs text-muted-foreground italic px-1">
              Preview: {resolvedDescription}
            </p>
          )}

          {/* Datetime picker */}
          <div className="flex items-center gap-2">
            <input type="datetime-local" value={newDate} onChange={e => setNewDate(e.target.value)} className="h-8 text-sm rounded-md border border-input bg-background px-2 text-muted-foreground" />
          </div>

          <Button size="sm" className="h-8 gap-1 shrink-0" onClick={handleAdd} disabled={!canAdd}>
            <Plus className="w-3.5 h-3.5" /> Add
          </Button>
        </div>
      )}
    </div>
  );
};
