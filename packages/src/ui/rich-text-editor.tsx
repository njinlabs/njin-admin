import TiptapImage from "@tiptap/extension-image";
import { type Editor, EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { type ReactNode, useEffect, useState } from "react";
import type { FileRow } from "../sdk/api/file";
import { Button } from "./button";
import { Checkbox } from "./checkbox";
import { cn } from "./cn";
import { Dialog } from "./dialog";
import { Field, FieldLabel } from "./field";
import type { FilePicker } from "./file-input";
import { Input } from "./input";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

const humanizeFilename = (name: string) =>
  name
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
    .trim();

const Icon = ({ children }: { children: ReactNode }) => (
  <svg
    viewBox="0 0 16 16"
    className="size-4"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {children}
  </svg>
);

const Tool = ({
  title,
  active,
  disabled,
  onClick,
  children,
}: {
  title: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) => (
  <Button
    type="button"
    size="icon"
    variant="ghost"
    title={title}
    aria-label={title}
    aria-pressed={active}
    disabled={disabled}
    onClick={onClick}
    className={cn(
      "size-8 text-xs font-semibold",
      active && "bg-subtle text-primary",
    )}
  >
    {children}
  </Button>
);

const Divider = () => <div className="mx-1 h-5 w-px bg-border" />;

const LinkButton = ({ editor }: { editor: Editor }) => {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [newTab, setNewTab] = useState(false);
  const [nofollow, setNofollow] = useState(false);

  return (
    <Popover
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        if (value) {
          const attrs = editor.getAttributes("link");
          setUrl(attrs.href ?? "");
          setTitle(attrs.title ?? "");
          setNewTab(attrs.target === "_blank");
          setNofollow((attrs.rel ?? "").includes("nofollow"));
        }
      }}
    >
      <PopoverTrigger
        render={
          <Button
            type="button"
            size="icon"
            variant="ghost"
            title="Link"
            aria-label="Link"
            className={cn(
              "size-8",
              editor.isActive("link") && "bg-subtle text-primary",
            )}
          />
        }
      >
        <Icon>
          <path d="M6.5 9.5a2.5 2.5 0 0 0 3.5 0l2.5-2.5a2.5 2.5 0 0 0-3.5-3.5l-.7.7M9.5 6.5a2.5 2.5 0 0 0-3.5 0L3.5 9a2.5 2.5 0 0 0 3.5 3.5l.7-.7" />
        </Icon>
      </PopoverTrigger>
      <PopoverContent className="w-72 space-y-3 p-3">
        <Field>
          <FieldLabel>URL</FieldLabel>
          <Input
            placeholder="https://"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel>Title (optional, helps SEO and accessibility)</FieldLabel>
          <Input
            placeholder="A short description of where it leads"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </Field>
        <Field orientation="horizontal">
          <Checkbox checked={newTab} onCheckedChange={setNewTab} />
          <FieldLabel>Open in a new tab</FieldLabel>
        </Field>
        <Field orientation="horizontal">
          <Checkbox checked={nofollow} onCheckedChange={setNofollow} />
          <FieldLabel>Mark as nofollow (sponsored or affiliate)</FieldLabel>
        </Field>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            className="flex-1"
            disabled={!url}
            onClick={() => {
              const rel = [
                newTab && "noopener noreferrer",
                nofollow && "nofollow",
              ]
                .filter(Boolean)
                .join(" ");

              editor
                .chain()
                .focus()
                .extendMarkRange("link")
                .setLink({
                  href: url,
                  title: title || null,
                  target: newTab ? "_blank" : null,
                  rel: rel || null,
                })
                .run();
              setOpen(false);
            }}
          >
            Set
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              editor.chain().focus().extendMarkRange("link").unsetLink().run();
              setOpen(false);
            }}
          >
            Remove
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

type ImageDetails = { alt: string; title: string };

const ImageDetailsDialog = ({
  open,
  onOpenChange,
  initial,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: ImageDetails;
  onSubmit: (details: ImageDetails) => void;
}) => {
  const [alt, setAlt] = useState(initial.alt);
  const [title, setTitle] = useState(initial.title);

  useEffect(() => {
    if (open) {
      setAlt(initial.alt);
      setTitle(initial.title);
    }
  }, [open, initial.alt, initial.title]);

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Image details"
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!alt}
            onClick={() => onSubmit({ alt, title })}
          >
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field>
          <FieldLabel>
            Alt text (required, for SEO and accessibility)
          </FieldLabel>
          <Input
            placeholder="Describe what the image shows"
            value={alt}
            onChange={(event) => setAlt(event.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel>Title (optional, shown on hover)</FieldLabel>
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </Field>
      </div>
    </Dialog>
  );
};

type RichTextEditorProps = {
  // The HTML of the text.
  value: string | null | undefined;
  onChange: (html: string) => void;
  // The window the images are chosen in; without it there is no image button.
  Picker?: FilePicker;
  // The address an image is written into the text with: the file's own url, or the one the server
  // optimizes it through.
  imageSrc?: (file: FileRow) => string;
};

export const RichTextEditor = ({
  value,
  onChange,
  Picker,
  imageSrc = (file) => file.url,
}: RichTextEditorProps) => {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pending, setPending] = useState<{ src: string; alt: string } | null>(
    null,
  );
  const [editingImage, setEditingImage] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ link: { openOnClick: false } }),
      TiptapImage,
    ],
    content: value ?? "",
    // The editor draws only once it is in the browser, so nothing differs between the server's
    // first render and the page's.
    immediatelyRender: false,
    // The toolbar shows what is under the cursor (bold, a heading), which changes without any edit.
    shouldRerenderOnTransaction: true,
    onUpdate: ({ editor: current }) => onChange(current.getHTML()),
  });

  // Another language, or a record loaded after the form opened, is a different text.
  useEffect(() => {
    if (editor && (value ?? "") !== editor.getHTML()) {
      editor.commands.setContent(value ?? "");
    }
  }, [value, editor]);

  if (!editor) return null;

  const run = () => editor.chain().focus();
  const image = editor.getAttributes("image");

  return (
    <div className="rounded-control border bg-background focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30">
      <div className="flex flex-wrap items-center gap-0.5 border-b p-1.5">
        <Tool
          title="Bold"
          active={editor.isActive("bold")}
          onClick={() => run().toggleBold().run()}
        >
          B
        </Tool>
        <Tool
          title="Italic"
          active={editor.isActive("italic")}
          onClick={() => run().toggleItalic().run()}
        >
          <span className="italic">I</span>
        </Tool>
        <Tool
          title="Underline"
          active={editor.isActive("underline")}
          onClick={() => run().toggleUnderline().run()}
        >
          <span className="underline">U</span>
        </Tool>
        <Tool
          title="Strikethrough"
          active={editor.isActive("strike")}
          onClick={() => run().toggleStrike().run()}
        >
          <span className="line-through">S</span>
        </Tool>
        <Divider />
        {([1, 2, 3] as const).map((level) => (
          <Tool
            key={level}
            title={
              level === 1
                ? "Heading 1 (once per page is best for SEO)"
                : `Heading ${level}`
            }
            active={editor.isActive("heading", { level })}
            onClick={() => run().toggleHeading({ level }).run()}
          >
            H{level}
          </Tool>
        ))}
        <Divider />
        <Tool
          title="Bullet list"
          active={editor.isActive("bulletList")}
          onClick={() => run().toggleBulletList().run()}
        >
          <Icon>
            <path d="M6 4h7M6 8h7M6 12h7M3 4h.01M3 8h.01M3 12h.01" />
          </Icon>
        </Tool>
        <Tool
          title="Ordered list"
          active={editor.isActive("orderedList")}
          onClick={() => run().toggleOrderedList().run()}
        >
          1.
        </Tool>
        <Tool
          title="Blockquote"
          active={editor.isActive("blockquote")}
          onClick={() => run().toggleBlockquote().run()}
        >
          ”
        </Tool>
        <Divider />
        <Tool
          title="Inline code"
          active={editor.isActive("code")}
          onClick={() => run().toggleCode().run()}
        >
          <Icon>
            <path d="m6 5-3 3 3 3M10 5l3 3-3 3" />
          </Icon>
        </Tool>
        <Tool
          title="Code block"
          active={editor.isActive("codeBlock")}
          onClick={() => run().toggleCodeBlock().run()}
        >
          {"{}"}
        </Tool>
        <LinkButton editor={editor} />
        {Picker && (
          <Tool title="Insert an image" onClick={() => setPickerOpen(true)}>
            <Icon>
              <rect x="2.5" y="3" width="11" height="10" rx="1.5" />
              <path d="m3 11 3-3 3 3 2-2 2.5 2.5M10.5 6h.01" />
            </Icon>
          </Tool>
        )}
        {editor.isActive("image") && (
          <Tool
            title="Edit the image's alt and title"
            onClick={() => setEditingImage(true)}
          >
            <Icon>
              <path d="m10.5 3.5 2 2L6 12l-3 1 1-3z" />
            </Icon>
          </Tool>
        )}
        <Tool
          title="Horizontal rule"
          onClick={() => run().setHorizontalRule().run()}
        >
          <Icon>
            <path d="M3 8h10" />
          </Icon>
        </Tool>
        <Divider />
        <Tool
          title="Undo"
          disabled={!editor.can().undo()}
          onClick={() => run().undo().run()}
        >
          <Icon>
            <path d="M5.5 3.5 3 6l2.5 2.5M3 6h6a3.5 3.5 0 0 1 0 7H6" />
          </Icon>
        </Tool>
        <Tool
          title="Redo"
          disabled={!editor.can().redo()}
          onClick={() => run().redo().run()}
        >
          <Icon>
            <path d="M10.5 3.5 13 6l-2.5 2.5M13 6H7a3.5 3.5 0 0 0 0 7h3" />
          </Icon>
        </Tool>
      </div>
      <EditorContent
        editor={editor}
        className={cn(
          "min-h-40 px-3 py-2 text-sm [&_.ProseMirror]:min-h-36 [&_.ProseMirror]:outline-none",
          "[&_h1]:my-3 [&_h1]:text-2xl [&_h1]:font-semibold [&_h2]:my-3 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:my-2 [&_h3]:text-lg [&_h3]:font-semibold",
          "[&_p]:my-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6",
          "[&_blockquote]:my-2 [&_blockquote]:border-l-4 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground",
          "[&_a]:text-primary [&_a]:underline [&_hr]:my-4 [&_img]:my-2 [&_img]:max-w-full [&_img]:rounded-control [&_img.ProseMirror-selectednode]:ring-2 [&_img.ProseMirror-selectednode]:ring-primary",
          "[&_code]:rounded-[4px] [&_code]:bg-subtle [&_code]:px-1 [&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-control [&_pre]:bg-subtle [&_pre]:p-3 [&_pre_code]:bg-transparent [&_pre_code]:p-0",
        )}
      />
      {Picker && (
        <Picker
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          accept={["image"]}
          value={[]}
          onChange={([file]) => {
            if (file) {
              setPending({
                src: imageSrc(file),
                alt: humanizeFilename(file.name),
              });
            }
          }}
        />
      )}
      <ImageDetailsDialog
        open={pending !== null}
        onOpenChange={(open) => !open && setPending(null)}
        initial={{ alt: pending?.alt ?? "", title: "" }}
        onSubmit={({ alt, title }) => {
          if (pending) {
            run()
              .setImage({ src: pending.src, alt, title: title || undefined })
              .run();
          }
          setPending(null);
        }}
      />
      <ImageDetailsDialog
        open={editingImage}
        onOpenChange={setEditingImage}
        initial={{ alt: image.alt ?? "", title: image.title ?? "" }}
        onSubmit={({ alt, title }) => {
          run()
            .updateAttributes("image", { alt, title: title || null })
            .run();
          setEditingImage(false);
        }}
      />
    </div>
  );
};
