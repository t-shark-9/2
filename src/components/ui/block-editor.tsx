import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { Block, BlockNoteEditor, PartialBlock } from "@blocknote/core";
import { useEffect } from "react";

interface BlockEditorProps {
  initialContent?: string;
  onChange?: (content: string) => void;
  placeholder?: string;
}

export function BlockEditor({ initialContent, onChange, placeholder }: BlockEditorProps) {
  const editor: BlockNoteEditor = useCreateBlockNote({
    initialContent: initialContent 
      ? (JSON.parse(initialContent) as PartialBlock[])
      : undefined,
  });

  useEffect(() => {
    if (!onChange) return;

    const handleChange = () => {
      const blocks = editor.document;
      onChange(JSON.stringify(blocks));
    };

    editor.onChange(handleChange);
  }, [editor, onChange]);

  return (
    <BlockNoteView 
      editor={editor} 
      theme="light"
      className="min-h-[600px]"
    />
  );
}
