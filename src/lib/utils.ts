import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import React from "react";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Parse simple markdown: **bold** and *italic*
 */
export function parseSimpleMarkdown(text: string): React.ReactNode[] {
  if (!text) return [];
  
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;
  
  // Regex to match **bold** or *italic* (bold first to avoid conflict)
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*)/g;
  let lastIndex = 0;
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    
    if (match[2]) {
      // Bold: **text**
      parts.push(React.createElement('strong', { key: key++, className: 'font-semibold' }, match[2]));
    } else if (match[3]) {
      // Italic: *text*
      parts.push(React.createElement('em', { key: key++ }, match[3]));
    }
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  
  return parts.length > 0 ? parts : [text];
}
