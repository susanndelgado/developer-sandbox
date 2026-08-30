from pathlib import Path

path = Path("src/local-editor/server.ts")
text = path.read_text(encoding="utf8")

old = '''      WHERE id = $id
    `,
      )
      .run(values);
  } else {
    database
      .prepare(
        `
      INSERT INTO records ('''

new = '''      WHERE id = $id
    `,
      )
      .run({
        id: values.id,
        title: values.title,
        slug: values.slug,
        description: values.description,
        type: values.type,
        status: values.status,
        visibility: values.visibility,
        featured: values.featured,
        sort_order: values.sort_order,
        updated: values.updated,
        presentation_mode: values.presentation_mode,
        nav_label: values.nav_label,
        nav_group: values.nav_group,
        notes: values.notes,
        custom_classes: values.custom_classes,
      });
  } else {
    database
      .prepare(
        `
      INSERT INTO records ('''

count = text.count(old)
if count != 1:
    raise SystemExit(f"Expected one saveRecord UPDATE match, found {count}")

path.write_text(text.replace(old, new, 1), encoding="utf8")
