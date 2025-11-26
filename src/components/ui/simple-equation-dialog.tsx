import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';

interface SimpleEquationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (latex: string) => void;
}

const quickInserts = [
  { label: "Fraction", latex: "\\frac{a}{b}" },
  { label: "Square Root", latex: "\\sqrt{x}" },
  { label: "Power", latex: "x^{n}" },
  { label: "Subscript", latex: "x_{i}" },
  { label: "Sum", latex: "\\sum_{i=1}^{n}" },
  { label: "Integral", latex: "\\int_{a}^{b}" },
  { label: "Greek α", latex: "\\alpha" },
  { label: "Greek β", latex: "\\beta" },
  { label: "Greek θ", latex: "\\theta" },
  { label: "Greek π", latex: "\\pi" },
  { label: "≤", latex: "\\leq" },
  { label: "≥", latex: "\\geq" },
  { label: "≠", latex: "\\neq" },
  { label: "±", latex: "\\pm" },
  { label: "∞", latex: "\\infty" },
  { label: "→", latex: "\\rightarrow" },
];

export function SimpleEquationDialog({ isOpen, onClose, onInsert }: SimpleEquationDialogProps) {
  const [latex, setLatex] = useState("");
  const [error, setError] = useState("");

  const handleInsert = () => {
    if (!latex.trim()) return;
    onInsert(latex);
    setLatex("");
    setError("");
    onClose();
  };

  const insertSymbol = (symbol: string) => {
    setLatex(prev => prev + symbol);
  };

  const renderPreview = () => {
    if (!latex.trim()) {
      return <div className="text-muted-foreground italic">Type LaTeX above to see preview</div>;
    }
    
    try {
      setError("");
      return <BlockMath math={latex} />;
    } catch (e) {
      setError("Invalid LaTeX syntax");
      return <div className="text-destructive text-sm">Invalid LaTeX syntax</div>;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Insert Equation</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>LaTeX Input</Label>
            <Textarea
              value={latex}
              onChange={(e) => setLatex(e.target.value)}
              placeholder="Enter LaTeX equation, e.g., x^2 + y^2 = r^2"
              className="font-mono min-h-[80px]"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label>Quick Insert</Label>
            <div className="flex flex-wrap gap-1">
              {quickInserts.map((item) => (
                <Button
                  key={item.label}
                  variant="outline"
                  size="sm"
                  onClick={() => insertSymbol(item.latex)}
                  className="text-xs"
                >
                  {item.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Preview</Label>
            <div className="border rounded-lg p-6 bg-muted/30 min-h-[100px] flex items-center justify-center">
              {renderPreview()}
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleInsert} disabled={!latex.trim() || !!error}>
              Insert Equation
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
