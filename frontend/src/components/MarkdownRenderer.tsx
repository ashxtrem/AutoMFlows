interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export default function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  if (!content || content.trim() === '') {
    return (
      <div className={`text-gray-400 italic text-sm ${className}`}>
        Click to add a comment...
      </div>
    );
  }

  // Display as plain text (markdown is only in the editor)
  return (
    <div className={`text-sm whitespace-pre-wrap break-words ${className}`} style={{ color: 'inherit' }}>
      {content}
    </div>
  );
}
