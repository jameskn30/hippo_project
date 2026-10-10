import { AtomicCodeMirrorEditor } from "@atomic-editor/editor";
import { Compartment, Prec } from "@codemirror/state";
import { type EditorView, ViewPlugin } from "@codemirror/view";
import { getCM, vim } from "@replit/codemirror-vim";
import { type ComponentProps, useEffect, useRef, useState } from "react";

type MarkdownEditorProps = ComponentProps<typeof AtomicCodeMirrorEditor> & {
  vimEnabled: boolean;
  onSave: () => void;
};

// Mount once per note, just like Atomic Editor's document lifecycle.
export function MarkdownEditor({ vimEnabled, onSave, readOnly, ...props }: MarkdownEditorProps) {
  const viewRef = useRef<EditorView | null>(null);
  const onSaveRef = useRef(onSave);
  const [configuration] = useState(() => {
    const compartment = new Compartment();
    return {
      compartment,
      extensions: [
        compartment.of([]),
        ViewPlugin.define((view) => {
          viewRef.current = view;
          return {
            destroy() {
              if (viewRef.current === view) viewRef.current = null;
            },
          };
        }),
      ],
    };
  });

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    // Vim must run before Atomic Editor's standard keymaps. Reconfigure
    // in place to retain the document, selection, scroll, and undo history.
    view.dispatch({
      effects: configuration.compartment.reconfigure(
        vimEnabled && !readOnly ? Prec.high(vim({ status: true })) : [],
      ),
    });
    const cm = getCM(view);
    if (cm) cm.save = () => onSaveRef.current();
  }, [configuration, readOnly, vimEnabled]);

  return (
    <AtomicCodeMirrorEditor {...props} readOnly={readOnly} extensions={configuration.extensions} />
  );
}
