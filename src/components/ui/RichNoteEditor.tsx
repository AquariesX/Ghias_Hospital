"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import {
  Bold,
  Italic,
  Underline,
  List,
  RotateCcw,
  Palette,
  Highlighter,
  Tag,
  HelpCircle,
} from "lucide-react";

interface RichNoteEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  label?: string;
  required?: boolean;
}

const TEXT_COLORS = [
  { name: "Default (Slate)", color: "#0f172a", bg: "bg-slate-900" },
  { name: "Critical (Red)", color: "#dc2626", bg: "bg-red-600" },
  { name: "Warning (Amber)", color: "#d97706", bg: "bg-amber-600" },
  { name: "Normal (Green)", color: "#16a34a", bg: "bg-emerald-600" },
  { name: "Medication (Blue)", color: "#2563eb", bg: "bg-blue-600" },
  { name: "Doctor Attention (Purple)", color: "#9333ea", bg: "bg-purple-600" },
];

const HIGHLIGHT_COLORS = [
  { name: "Yellow", color: "#fef08a", border: "border-yellow-400", bg: "bg-yellow-200" },
  { name: "Green", color: "#bbf7d0", border: "border-emerald-400", bg: "bg-emerald-200" },
  { name: "Pink / Red", color: "#fecdd3", border: "border-rose-400", bg: "bg-rose-200" },
  { name: "Light Blue", color: "#bae6fd", border: "border-sky-400", bg: "bg-sky-200" },
];

const CLINICAL_STAMPS = [
  {
    label: "Critical Alert",
    html: '<span style="display:inline-block;background-color:#fee2e2;color:#b91c1c;padding:2px 8px;border-radius:4px;font-weight:700;font-size:11px;border:1px solid #fca5a5;margin:0 2px;">[CRITICAL - STAT]</span>&nbsp;',
  },
  {
    label: "Abnormal",
    html: '<span style="display:inline-block;background-color:#fef3c7;color:#b45309;padding:2px 8px;border-radius:4px;font-weight:700;font-size:11px;border:1px solid #fcd34d;margin:0 2px;">[ABNORMAL]</span>&nbsp;',
  },
  {
    label: "Stable",
    html: '<span style="display:inline-block;background-color:#dcfce7;color:#15803d;padding:2px 8px;border-radius:4px;font-weight:700;font-size:11px;border:1px solid #86efac;margin:0 2px;">[NORMAL / STABLE]</span>&nbsp;',
  },
  {
    label: "Med Given",
    html: '<span style="display:inline-block;background-color:#e0f2fe;color:#0369a1;padding:2px 8px;border-radius:4px;font-weight:700;font-size:11px;border:1px solid #7dd3fc;margin:0 2px;">[MEDICATION ADMINISTERED]</span>&nbsp;',
  },
  {
    label: "Doctor Informed",
    html: '<span style="display:inline-block;background-color:#f3e8ff;color:#7e22ce;padding:2px 8px;border-radius:4px;font-weight:700;font-size:11px;border:1px solid #d8b4fe;margin:0 2px;">[DOCTOR NOTIFIED]</span>&nbsp;',
  },
];

export default function RichNoteEditor({
  value,
  onChange,
  placeholder = "Enter clinical notes... Select text to apply colors.",
  minHeight = "150px",
  label,
  required = false,
}: RichNoteEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [showColorMenu, setShowColorMenu] = useState(false);
  const [showHighlightMenu, setShowHighlightMenu] = useState(false);
  const [showStampsMenu, setShowStampsMenu] = useState(false);
  const [customColor, setCustomColor] = useState("#dc2626");

  // Keep editor content in sync with external value without triggering cursor jumps
  useEffect(() => {
    if (editorRef.current) {
      if (editorRef.current.innerHTML !== value) {
        // If value was reset externally to empty or different content
        if (!value || value.trim() === "") {
          editorRef.current.innerHTML = "";
        } else if (editorRef.current.innerHTML === "" && value) {
          editorRef.current.innerHTML = value;
        }
      }
    }
  }, [value]);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      // If editor contains only a br or whitespace, consider it empty
      if (html === "<br>" || html.trim() === "") {
        onChange("");
      } else {
        onChange(html);
      }
    }
  }, [onChange]);

  // Execute standard formatting commands
  const executeCommand = (command: string, arg?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, arg);
    handleInput();
  };

  // Apply custom text color to selection or current line/word
  const applyTextColor = (color: string) => {
    editorRef.current?.focus();
    const selection = window.getSelection();

    if (selection && !selection.isCollapsed) {
      // Direct selection
      document.execCommand("styleWithCSS", false, "true");
      document.execCommand("foreColor", false, color);
    } else {
      // If no text is selected, try selecting current word
      selectCurrentWordOrLine();
      document.execCommand("styleWithCSS", false, "true");
      document.execCommand("foreColor", false, color);
    }

    handleInput();
    setShowColorMenu(false);
  };

  // Apply highlight background color
  const applyHighlight = (color: string | null) => {
    editorRef.current?.focus();
    const selection = window.getSelection();

    if (selection && !selection.isCollapsed) {
      document.execCommand("styleWithCSS", false, "true");
      if (color) {
        document.execCommand("hiliteColor", false, color);
      } else {
        document.execCommand("removeFormat", false);
      }
    } else {
      selectCurrentWordOrLine();
      document.execCommand("styleWithCSS", false, "true");
      if (color) {
        document.execCommand("hiliteColor", false, color);
      } else {
        document.execCommand("removeFormat", false);
      }
    }

    handleInput();
    setShowHighlightMenu(false);
  };

  // Helper to expand cursor to surrounding word or line if nothing is selected
  const selectCurrentWordOrLine = () => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    if (!range.collapsed) return;

    // Expand to word boundaries if supported
    type SelectionWithModify = Selection & {
      modify?: (alter: string, direction: string, granularity: string) => void;
    };
    const extSel = sel as unknown as SelectionWithModify;
    if (typeof extSel.modify === "function") {
      try {
        extSel.modify("move", "backward", "word");
        extSel.modify("extend", "forward", "word");
      } catch {
        // Ignore if selection boundary fails
      }
    }
  };

  // Insert clinical stamp HTML at cursor
  const insertStamp = (stampHtml: string) => {
    editorRef.current?.focus();
    document.execCommand("insertHTML", false, stampHtml);
    handleInput();
    setShowStampsMenu(false);
  };

  // Clear all formatting on selection
  const clearFormatting = () => {
    editorRef.current?.focus();
    document.execCommand("removeFormat", false);
    handleInput();
  };

  return (
    <div className="space-y-1.5">
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-xs font-semibold text-slate-700">
            {label} {required && <span className="text-rose-600">*</span>}
          </label>
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <Palette className="w-3 h-3 text-teal-600" />
            Color &amp; Highlight Enabled
          </span>
        </div>
      )}

      {/* Editor Container */}
      <div className="border border-slate-300 rounded-xl overflow-hidden bg-white shadow-xs focus-within:ring-2 focus-within:ring-teal-500/20 focus-within:border-teal-500 transition-all">
        {/* Formatting Toolbar */}
        <div className="bg-slate-50 border-b border-slate-200 px-3 py-2 flex flex-wrap items-center gap-1.5 select-none">
          {/* Basic Formatting Group */}
          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => executeCommand("bold")}
              title="Bold (Ctrl+B)"
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
            >
              <Bold className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => executeCommand("italic")}
              title="Italic (Ctrl+I)"
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
            >
              <Italic className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => executeCommand("underline")}
              title="Underline (Ctrl+U)"
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
            >
              <Underline className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => executeCommand("insertUnorderedList")}
              title="Bullet List"
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-4 w-[1px] bg-slate-200 mx-0.5" />

          {/* Text Color Swatches & Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowColorMenu(!showColorMenu);
                setShowHighlightMenu(false);
                setShowStampsMenu(false);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:text-teal-700 hover:border-teal-300 rounded-lg shadow-2xs transition-colors"
            >
              <Palette className="w-3.5 h-3.5 text-rose-600" />
              <span>Text Color</span>
            </button>

            {showColorMenu && (
              <div className="absolute left-0 top-full mt-1 z-30 bg-white border border-slate-200 rounded-xl shadow-lg p-2.5 w-60 space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Select Text Color
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {TEXT_COLORS.map((tc) => (
                    <button
                      key={tc.color}
                      type="button"
                      onClick={() => applyTextColor(tc.color)}
                      className="flex items-center gap-1.5 p-1.5 rounded hover:bg-slate-50 border border-slate-100 text-left text-xs text-slate-700 transition"
                      title={tc.name}
                    >
                      <span
                        className="w-3.5 h-3.5 rounded-full shrink-0 border border-black/10"
                        style={{ backgroundColor: tc.color }}
                      />
                      <span className="truncate text-[11px] font-medium">{tc.name.split(" ")[0]}</span>
                    </button>
                  ))}
                </div>

                {/* Custom Color Picker Input */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-600">Custom Color:</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={customColor}
                      onChange={(e) => setCustomColor(e.target.value)}
                      className="w-6 h-6 rounded cursor-pointer border-0 p-0"
                    />
                    <button
                      type="button"
                      onClick={() => applyTextColor(customColor)}
                      className="px-2 py-0.5 text-[11px] font-bold bg-slate-800 text-white rounded hover:bg-slate-700"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Highlight Color Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowHighlightMenu(!showHighlightMenu);
                setShowColorMenu(false);
                setShowStampsMenu(false);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:text-amber-700 hover:border-amber-300 rounded-lg shadow-2xs transition-colors"
            >
              <Highlighter className="w-3.5 h-3.5 text-amber-500" />
              <span>Highlight</span>
            </button>

            {showHighlightMenu && (
              <div className="absolute left-0 top-full mt-1 z-30 bg-white border border-slate-200 rounded-xl shadow-lg p-2.5 w-52 space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Highlight Word / Line
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {HIGHLIGHT_COLORS.map((hc) => (
                    <button
                      key={hc.name}
                      type="button"
                      onClick={() => applyHighlight(hc.color)}
                      className="flex items-center gap-2 p-1.5 rounded hover:opacity-90 border border-slate-200 text-left text-xs transition"
                      style={{ backgroundColor: hc.color }}
                    >
                      <span className="text-[11px] font-semibold text-slate-900">{hc.name}</span>
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => applyHighlight(null)}
                  className="w-full text-center py-1 text-[11px] text-slate-600 hover:bg-slate-100 rounded border border-slate-200 font-medium"
                >
                  Clear Highlight
                </button>
              </div>
            )}
          </div>

          {/* Clinical Stamps Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowStampsMenu(!showStampsMenu);
                setShowColorMenu(false);
                setShowHighlightMenu(false);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:text-purple-700 hover:border-purple-300 rounded-lg shadow-2xs transition-colors"
            >
              <Tag className="w-3.5 h-3.5 text-purple-600" />
              <span>Clinical Tags</span>
            </button>

            {showStampsMenu && (
              <div className="absolute left-0 top-full mt-1 z-30 bg-white border border-slate-200 rounded-xl shadow-lg p-2 w-56 space-y-1">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1">
                  Insert Clinical Tag
                </div>
                {CLINICAL_STAMPS.map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => insertStamp(s.html)}
                    className="w-full text-left p-1.5 hover:bg-slate-50 rounded text-xs transition font-medium flex items-center justify-between"
                  >
                    <span>{s.label}</span>
                    <span className="text-[10px] text-slate-400">+ Insert</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="h-4 w-[1px] bg-slate-200 mx-0.5" />

          {/* Clear Formatting */}
          <button
            type="button"
            onClick={clearFormatting}
            title="Clear Formatting"
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded transition-colors ml-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Editable Clinical Area */}
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onBlur={handleInput}
          style={{ minHeight }}
          data-placeholder={placeholder}
          className="p-3.5 text-sm text-slate-800 focus:outline-none overflow-y-auto leading-relaxed empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400 empty:before:pointer-events-none"
        />
      </div>

      {/* Guide & Instructions */}
      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 pt-0.5">
        <HelpCircle className="w-3.5 h-3.5 text-teal-600 shrink-0" />
        <span>
          <strong>Color tip:</strong> Highlight any word, line, or paragraph with your mouse, then click <strong>Text Color</strong> or <strong>Highlight</strong> above.
        </span>
      </div>
    </div>
  );
}
