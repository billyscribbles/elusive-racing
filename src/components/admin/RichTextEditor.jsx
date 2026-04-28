import { Editor } from "@tinymce/tinymce-react";

import "tinymce/tinymce";
import "tinymce/models/dom";
import "tinymce/themes/silver";
import "tinymce/icons/default";
import "tinymce/skins/ui/oxide/skin.js";

import "tinymce/plugins/advlist";
import "tinymce/plugins/autolink";
import "tinymce/plugins/lists";
import "tinymce/plugins/link";
import "tinymce/plugins/image";
import "tinymce/plugins/charmap";
import "tinymce/plugins/preview";
import "tinymce/plugins/anchor";
import "tinymce/plugins/searchreplace";
import "tinymce/plugins/visualblocks";
import "tinymce/plugins/code";
import "tinymce/plugins/fullscreen";
import "tinymce/plugins/insertdatetime";
import "tinymce/plugins/media";
import "tinymce/plugins/table";
import "tinymce/plugins/help";
import "tinymce/plugins/wordcount";

import contentCss from "tinymce/skins/content/default/content.css?inline";
import skinCss from "tinymce/skins/ui/oxide/content.css?inline";

export default function RichTextEditor({
  value,
  onChange,
  placeholder,
  height = 320,
  // theme prop is accepted for API compatibility but intentionally ignored —
  // the editor is always rendered in the light skin so the typing surface
  // stays readable regardless of the surrounding admin theme.
  theme: _theme,
}) {
  return (
    <Editor
      value={value}
      onEditorChange={(content) => onChange(content)}
      init={{
        license_key: "gpl",
        base_url: "/tinymce",
        suffix: ".min",
        height,
        menubar: false,
        placeholder,
        branding: false,
        promotion: false,
        skin: "oxide",
        content_css: "default",
        content_style: [
          contentCss,
          skinCss,
          "body{font-family:Inter,system-ui,sans-serif;font-size:14px;background:#fff;color:#111;}",
        ].join("\n"),
        plugins: [
          "advlist",
          "autolink",
          "lists",
          "link",
          "image",
          "charmap",
          "preview",
          "anchor",
          "searchreplace",
          "visualblocks",
          "code",
          "fullscreen",
          "insertdatetime",
          "media",
          "table",
          "help",
          "wordcount",
        ],
        toolbar:
          "undo redo | blocks | bold italic underline strikethrough | " +
          "alignleft aligncenter alignright alignjustify | " +
          "bullist numlist outdent indent | link image table | " +
          "removeformat code",
      }}
    />
  );
}
