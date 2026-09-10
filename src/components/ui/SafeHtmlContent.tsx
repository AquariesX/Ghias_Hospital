"use client";

import React, { useMemo } from "react";

interface SafeHtmlContentProps {
  content?: string | null;
  className?: string;
}

/**
 * Sanitizes and renders clinical notes that may contain colored spans,
 * highlights, bold text, or clinical tags, while preventing XSS.
 */
export function sanitizeClinicalHtml(html: string): string {
  if (!html) return "";

  // If there are no HTML tags, return as-is
  if (!/<[a-z][\s\S]*>/i.test(html)) {
    return html;
  }

  // Remove dangerous tags and attributes
  const clean = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, "")
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, "")
    .replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, "")
    .replace(/<input\b[^>]*>/gi, "")
    .replace(/<button\b[^<]*(?:(?!<\/button>)<[^<]*)*<\/button>/gi, "")
    .replace(/\son\w+\s*=\s*(['"]).*?\1/gi, "") // remove on* handlers like onclick
    .replace(/\son\w+\s*=\s*[^>\s]+/gi, "")
    .replace(/javascript:/gi, "");

  return clean;
}

export default function SafeHtmlContent({
  content,
  className = "",
}: SafeHtmlContentProps) {
  const isHtml = Boolean(content && /<[a-z][\s\S]*>/i.test(content));

  const sanitized = useMemo(() => {
    if (!content || !isHtml) return "";
    return sanitizeClinicalHtml(content);
  }, [content, isHtml]);

  if (!content) {
    return <span className="text-slate-400 italic">No notes recorded</span>;
  }

  if (!isHtml) {
    return (
      <p className={`whitespace-pre-wrap ${className}`}>
        {content}
      </p>
    );
  }

  return (
    <div
      className={`prose-sm max-w-none break-words leading-relaxed [&_p]:my-1 [&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4 [&_mark]:px-1.5 [&_mark]:py-0.5 [&_mark]:rounded ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}
