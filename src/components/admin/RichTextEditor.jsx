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
import darkSkinCss from "tinymce/skins/ui/oxide-dark/content.css?inline";

export default function RichTextEditor({
  value,
  onChange,
  placeholder,
  height = 320,
  theme = "light",
}) {
  return (
    <Editor
      value={value}
      onEditorChange={(content) => onChange(content)}
      init={{
        license_key: "gpl",
        height,
        menubar: false,
        placeholder,
        branding: false,
        promotion: false,
        skin: theme === "dark" ? "oxide-dark" : "oxide",
        content_css: theme === "dark" ? "dark" : "default",
        content_style: [
          contentCss,
          theme === "dark" ? darkSkinCss : skinCss,
          "body{font-family:Inter,system-ui,sans-serif;font-size:14px;}",
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
