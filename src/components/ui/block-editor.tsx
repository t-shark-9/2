import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { BlockNoteEditor, PartialBlock } from "@blocknote/core";
import { useEffect, useState } from "react";
import { EquationEditor } from "@/components/ui/equation-editor";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface BlockEditorProps {
  initialContent?: string;
  onChange?: (content: string) => void;
  placeholder?: string;
}

async function uploadFile(file: File): Promise<string> {
  // Create a unique filename
  const timestamp = Date.now();
  const filename = `${timestamp}-${file.name}`;
  
  // For now, use a data URL (base64) to embed images
  // In production, you'd upload to Supabase Storage
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function BlockEditor({ initialContent, onChange, placeholder }: BlockEditorProps) {
  const [isDrawingOpen, setIsDrawingOpen] = useState(false);
  const [isEquationOpen, setIsEquationOpen] = useState(false);
  
  const editor: BlockNoteEditor = useCreateBlockNote({
    initialContent: initialContent 
      ? (JSON.parse(initialContent) as PartialBlock[])
      : undefined,
    uploadFile,
  });

  useEffect(() => {
    if (!onChange) return;

    const handleChange = () => {
      const blocks = editor.document;
      onChange(JSON.stringify(blocks));
    };

    editor.onChange(handleChange);
  }, [editor, onChange]);

  // Listen for drawing insertion from the iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'drawing-saved' && event.data.imageData) {
        // Insert the drawing as an image block
        const currentBlock = editor.getTextCursorPosition().block;
        editor.insertBlocks(
          [
            {
              type: "image",
              props: {
                url: event.data.imageData,
                caption: "Drawing",
              },
            },
          ],
          currentBlock,
          "after"
        );
        setIsDrawingOpen(false);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [editor]);

  const handleEquationInsert = (latex: string, isInline: boolean) => {
    const currentBlock = editor.getTextCursorPosition().block;
    
    if (isInline) {
      // Insert inline equation as text with special marker
      editor.insertInlineContent([
        {
          type: "text",
          text: `$${latex}$`,
          styles: { code: true },
        },
      ]);
    } else {
      // Insert block equation as a paragraph with code styling
      editor.insertBlocks(
        [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: `$$${latex}$$`,
                styles: { code: true },
              },
            ],
          },
        ],
        currentBlock,
        "after"
      );
    }
    
    setIsEquationOpen(false);
  };

  return (
    <>
      <div className="relative">
        <BlockNoteView 
          editor={editor} 
          theme="light"
          className="min-h-[600px]"
        />
        
        {/* Custom buttons to trigger drawing and equation tools */}
        <div className="absolute top-2 right-2 flex gap-2">
          <button
            onClick={() => setIsEquationOpen(true)}
            className="px-3 py-2 text-sm bg-background border border-border rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
            title="Add Equation"
          >
            ∑ Equation
          </button>
          <button
            onClick={() => setIsDrawingOpen(true)}
            className="px-3 py-2 text-sm bg-background border border-border rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
            title="Add Drawing"
          >
            ✏ Drawing
          </button>
        </div>
      </div>

      {/* Equation Editor Dialog */}
      <EquationEditor
        isOpen={isEquationOpen}
        onClose={() => setIsEquationOpen(false)}
        onInsert={handleEquationInsert}
      />

      {/* Drawing Dialog */}
      <Dialog open={isDrawingOpen} onOpenChange={setIsDrawingOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full p-0">
          <DialogHeader className="p-4 border-b">
            <DialogTitle>Illustration Editor</DialogTitle>
            <DialogDescription>
              Create drawings and diagrams. Save your illustration to insert it into your draft.
            </DialogDescription>
          </DialogHeader>
          <div className="w-full h-[calc(95vh-100px)] overflow-hidden">
            <iframe 
              src="/drawings/index.html" 
              className="w-full h-full border-0"
              title="Illustration Editor"
              sandbox="allow-scripts allow-same-origin allow-downloads allow-modals"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
