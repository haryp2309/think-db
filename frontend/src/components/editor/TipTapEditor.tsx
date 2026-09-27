import React, { useEffect } from 'react';
import { useEditor, EditorContent, NodeViewWrapper, NodeViewContent, ReactNodeViewRenderer } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Markdown } from 'tiptap-markdown';
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code2,
  Undo,
  Redo,
  RemoveFormatting,
  ChevronDown,
  Check
} from 'lucide-react';

import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { all, createLowlight } from 'lowlight';

const lowlight = createLowlight(all);

const LANGUAGE_OPTIONS = [
  { label: 'Plain Text', value: '' },
  { label: 'Python', value: 'python' },
  { label: 'JavaScript', value: 'javascript' },
  { label: 'TypeScript', value: 'typescript' },
  { label: 'SQL', value: 'sql' },
  { label: 'JSON', value: 'json' },
  { label: 'HTML', value: 'html' },
  { label: 'CSS', value: 'css' },
  { label: 'Bash / Shell', value: 'bash' },
  { label: 'YAML', value: 'yaml' },
  { label: 'Markdown', value: 'markdown' },
  { label: 'Go', value: 'go' },
  { label: 'Rust', value: 'rust' },
  { label: 'C++', value: 'cpp' },
  { label: 'Java', value: 'java' },
  { label: 'C#', value: 'csharp' },
  { label: 'PHP', value: 'php' },
  { label: 'Ruby', value: 'ruby' },
];

const CodeBlockComponent: React.FC<any> = ({ node, updateAttributes }) => {
  const [showPicker, setShowPicker] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const currentLang = node.attrs.language || '';
  const currentLabel = LANGUAGE_OPTIONS.find((l) => l.value === currentLang)?.label || currentLang || 'text';

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    };
    if (showPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPicker]);

  return (
    <NodeViewWrapper className="relative my-4 group font-mono">
      {/* Greyed-out Language Badge & Selector Button */}
      <div ref={dropdownRef} className="absolute right-3 top-2.5 z-20" contentEditable={false}>
        <button
          type="button"
          onClick={() => setShowPicker(!showPicker)}
          className="px-2 py-0.5 rounded bg-slate-800/90 hover:bg-slate-700 text-[11px] text-slate-400 hover:text-slate-200 border border-slate-700/60 flex items-center gap-1 transition-colors select-none font-sans font-medium shadow-xs"
          title="Select code language"
        >
          <span className="capitalize">{currentLabel}</span>
          <ChevronDown className="w-3 h-3 text-slate-500 shrink-0" />
        </button>

        {showPicker && (
          <div className="absolute right-0 top-full mt-1.5 w-40 max-h-56 overflow-y-auto bg-slate-900 border border-slate-700/80 rounded-lg shadow-2xl py-1 text-xs select-none z-50 text-slate-300 animate-modal-pop">
            {LANGUAGE_OPTIONS.map((lang) => (
              <button
                key={lang.value || 'plain'}
                type="button"
                onClick={() => {
                  updateAttributes({ language: lang.value });
                  setShowPicker(false);
                }}
                className={`w-full text-left px-3 py-1.5 hover:bg-slate-800 transition-colors flex items-center justify-between font-sans ${
                  currentLang === lang.value ? 'text-blue-400 font-semibold bg-blue-500/10' : ''
                }`}
              >
                <span>{lang.label}</span>
                {currentLang === lang.value && <Check className="w-3 h-3 text-blue-400" />}
              </button>
            ))}
          </div>
        )}
      </div>

      <pre className="!bg-[#0f172a] dark:!bg-[#121212] !border !border-slate-800 rounded-xl p-4 pt-10 font-mono text-sm leading-relaxed overflow-x-auto text-slate-100">
        <NodeViewContent />
      </pre>
    </NodeViewWrapper>
  );
};

interface TipTapEditorProps {
  content: string;
  onChange: (newContent: string) => void;
  placeholder?: string;
}

export const TipTapEditor: React.FC<TipTapEditorProps> = ({
  content,
  onChange,
  placeholder = 'Type formatted markdown notes, tasks, or docs...'
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: false,
      }),
      CodeBlockLowlight.extend({
        addNodeView() {
          return ReactNodeViewRenderer(CodeBlockComponent);
        },
      }).configure({
        lowlight,
      }),
      Placeholder.configure({
        placeholder,
      }),
      Markdown.configure({
        html: false,
        transformPastedText: true,
        transformCopiedText: true,
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      const markdown = (editor.storage as any).markdown?.getMarkdown() ?? editor.getText();
      onChange(markdown);
    },
    editorProps: {
      attributes: {
        class:
          'prose dark:prose-invert max-w-none focus:outline-none min-h-[360px] p-6 leading-relaxed text-slate-800 dark:text-slate-200 font-sans cursor-text selection:bg-blue-500/30',
      },
    },
  });

  useEffect(() => {
    if (editor) {
      const currentMd = (editor.storage as any).markdown?.getMarkdown() ?? '';
      if (content !== currentMd) {
        editor.commands.setContent(content, { emitUpdate: false });
      }
    }
  }, [content, editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className="w-full h-full bg-white dark:bg-[#191919] border border-slate-200 dark:border-zinc-800/80 rounded-xl overflow-hidden shadow-xs flex flex-col transition-all">
      {/* Sleek Notion Formatting Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 bg-slate-50 dark:bg-[#202020] border-b border-slate-200 dark:border-zinc-800 text-xs shrink-0">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`p-1.5 rounded-lg transition-all ${
            editor.isActive('heading', { level: 1 })
              ? 'bg-blue-600 text-white font-bold shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
          title="Heading 1"
        >
          <Heading1 className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`p-1.5 rounded-lg transition-all ${
            editor.isActive('heading', { level: 2 })
              ? 'bg-blue-600 text-white font-bold shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
          title="Heading 2"
        >
          <Heading2 className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`p-1.5 rounded-lg transition-all ${
            editor.isActive('heading', { level: 3 })
              ? 'bg-blue-600 text-white font-bold shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
          title="Heading 3"
        >
          <Heading3 className="w-3.5 h-3.5" />
        </button>

        <div className="w-px h-4 bg-slate-300 dark:bg-slate-800 mx-1" />

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-1.5 rounded-lg transition-all ${
            editor.isActive('bold')
              ? 'bg-blue-600 text-white font-bold shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
          title="Bold"
        >
          <Bold className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-1.5 rounded-lg transition-all ${
            editor.isActive('italic')
              ? 'bg-blue-600 text-white font-bold shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
          title="Italic"
        >
          <Italic className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`p-1.5 rounded-lg transition-all ${
            editor.isActive('strike')
              ? 'bg-blue-600 text-white font-bold shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
          title="Strikethrough"
        >
          <Strikethrough className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleCode().run()}
          className={`p-1.5 rounded-lg transition-all ${
            editor.isActive('code')
              ? 'bg-blue-600 text-white font-bold shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
          title="Inline Code"
        >
          <Code className="w-3.5 h-3.5" />
        </button>

        <div className="w-px h-4 bg-slate-300 dark:bg-slate-800 mx-1" />

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-1.5 rounded-lg transition-all ${
            editor.isActive('bulletList')
              ? 'bg-blue-600 text-white font-bold shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
          title="Bullet List"
        >
          <List className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-1.5 rounded-lg transition-all ${
            editor.isActive('orderedList')
              ? 'bg-blue-600 text-white font-bold shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
          title="Numbered List"
        >
          <ListOrdered className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`p-1.5 rounded-lg transition-all ${
            editor.isActive('blockquote')
              ? 'bg-blue-600 text-white font-bold shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
          title="Quote Block"
        >
          <Quote className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={`p-1.5 rounded-lg transition-all ${
            editor.isActive('codeBlock')
              ? 'bg-blue-600 text-white font-bold shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
          title="Code Block"
        >
          <Code2 className="w-3.5 h-3.5" />
        </button>

        <div className="w-px h-4 bg-slate-300 dark:bg-slate-800 mx-1 ml-auto" />

        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 disabled:opacity-30 transition-colors"
          title="Undo"
        >
          <Undo className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 disabled:opacity-30 transition-colors"
          title="Redo"
        >
          <Redo className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
          className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
          title="Clear Formatting"
        >
          <RemoveFormatting className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Editor Content Area */}
      <EditorContent editor={editor} className="flex-1 overflow-y-auto" />
    </div>
  );
};
