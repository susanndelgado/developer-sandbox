from pathlib import Path

path = Path("assets/inner.css")
text = path.read_text(encoding="utf8")

replacements = [
    (
        '''.preview .project-meta p {
  margin: 5px 0 0;

  color: var(--sandbox-muted);

  font-size: 10px;''',
        '''.preview .project-meta p {
  margin: 5px 0 0;

  color: var(--sandbox-muted);

  font-size: 11px;''',
        "project meta body",
    ),
    (
        '''.preview .project-documents > a strong {
  color: #e9f5ff;

  font-size: 10px;''',
        '''.preview .project-documents > a strong {
  color: #e9f5ff;

  font-size: 11px;''',
        "project document title",
    ),
    (
        '''.preview .project-doc-section > header > span {
  display: block;
  position: static;
  margin-bottom: 0.35rem;
  line-height: 1.2;
  grid-column: 1;
  grid-row: 1;

  align-self: center;

  width: fit-content;

  color: var(--sandbox-blue);

  font-size: 9px;''',
        '''.preview .project-doc-section > header > span {
  display: block;
  position: static;
  margin-bottom: 0.35rem;
  line-height: 1.2;
  grid-column: 1;
  grid-row: 1;

  align-self: center;

  width: fit-content;

  color: var(--sandbox-blue);

  font-size: 10px;''',
        "project doc direct label",
    ),
    (
        '''.preview .project-doc-section > header > div > span {
  color: var(--sandbox-blue);

  font-size: 9px;''',
        '''.preview .project-doc-section > header > div > span {
  color: var(--sandbox-blue);

  font-size: 10px;''',
        "project doc wrapped label",
    ),
    (
        '''.preview .project-doc-section > header > p {
  max-width: 360px;

  margin: 0;

  color: var(--sandbox-muted);

  font-size: 9.5px;''',
        '''.preview .project-doc-section > header > p {
  max-width: 360px;

  margin: 0;

  color: var(--sandbox-muted);

  font-size: 10px;''',
        "project doc header description",
    ),
    (
        '''.preview .project-command > .project-command-title,
.preview .project-command > strong {
  display: block;

  width: 100%;

  margin: 0 0 5px;

  color: #eaf6ff;

  font-size: 10px;''',
        '''.preview .project-command > .project-command-title,
.preview .project-command > strong {
  display: block;

  width: 100%;

  margin: 0 0 5px;

  color: #eaf6ff;

  font-size: 11px;''',
        "project command title",
    ),
    (
        '''.preview .project-command p {
  width: 100%;

  margin: 0 0 6px;

  color: var(--sandbox-muted);

  font-size: 9.5px;''',
        '''.preview .project-command p {
  width: 100%;

  margin: 0 0 6px;

  color: var(--sandbox-muted);

  font-size: 11px;''',
        "project command body",
    ),
    (
        '''.preview .project-command-content > .project-command-title,
.preview .project-command-summary > .project-command-title {
  display: block;

  margin: 0 0 5px;

  color: #eaf6ff;

  font-size: 10px;''',
        '''.preview .project-command-content > .project-command-title,
.preview .project-command-summary > .project-command-title {
  display: block;

  margin: 0 0 5px;

  color: #eaf6ff;

  font-size: 11px;''',
        "project action row title",
    ),
    (
        '''.preview .project-command-panel {
  grid-column: 1 / -1;

  padding: 12px 14px;

  border-top: 1px solid rgba(95, 170, 255, 0.12);

  color: var(--sandbox-muted);

  background: rgba(2, 11, 25, 0.36);

  font-size: 10px;''',
        '''.preview .project-command-panel {
  grid-column: 1 / -1;

  padding: 12px 14px;

  border-top: 1px solid rgba(95, 170, 255, 0.12);

  color: var(--sandbox-muted);

  background: rgba(2, 11, 25, 0.36);

  font-size: 11px;''',
        "project command panel body",
    ),
    (
        '''.preview .project-example code {
  color: #cdeaff;

  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 10px;''',
        '''.preview .project-example code {
  color: #cdeaff;

  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11px;''',
        "project example code",
    ),
    (
        '''.preview .project-note {
  display: block;

  margin: 12px;
  padding: 11px 12px;

  border: 1px solid rgba(95, 200, 255, 0.16);
  border-left: 3px solid var(--sandbox-blue);

  color: var(--sandbox-muted);
  background: var(--sandbox-note);

  font-size: 10px;''',
        '''.preview .project-note {
  display: block;

  margin: 12px;
  padding: 11px 12px;

  border: 1px solid rgba(95, 200, 255, 0.16);
  border-left: 3px solid var(--sandbox-blue);

  color: var(--sandbox-muted);
  background: var(--sandbox-note);

  font-size: 11px;''',
        "project note body",
    ),
    (
        '''.preview .project-split-cell {
  min-width: 0;

  padding: 11px 12px;

  border-right: 1px solid rgba(95, 170, 255, 0.12);

  color: var(--sandbox-muted);

  font-size: 10px;''',
        '''.preview .project-split-cell {
  min-width: 0;

  padding: 11px 12px;

  border-right: 1px solid rgba(95, 170, 255, 0.12);

  color: var(--sandbox-muted);

  font-size: 11px;''',
        "project split body",
    ),
    (
        '''.preview .sandbox-entry-preview table,
.preview .project-content table {
  width: 100%;

  border-collapse: collapse;

  color: var(--sandbox-text);

  font-size: 10px;''',
        '''.preview .sandbox-entry-preview table,
.preview .project-content table {
  width: 100%;

  border-collapse: collapse;

  color: var(--sandbox-text);

  font-size: 11px;''',
        "project table body",
    ),
    (
        '''.preview .project-display-details {
  padding: 12px 14px;
  color: var(--sandbox-muted);
  font-size: 10px;''',
        '''.preview .project-display-details {
  padding: 12px 14px;
  color: var(--sandbox-muted);
  font-size: 11px;''',
        "project display details",
    ),
]

for old, new, label in replacements:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {count}")
    text = text.replace(old, new, 1)

path.write_text(text, encoding="utf8")
