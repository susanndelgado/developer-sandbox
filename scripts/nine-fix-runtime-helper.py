from pathlib import Path
import sys

mode = sys.argv[1] if len(sys.argv) > 1 else ""

if mode == "prepare":
    path = Path("scripts/apply-nine-safety-fixes-once.py")
    text = path.read_text(encoding="utf8")

    count_old = '    3,\n    "generator action link attributes",'
    count_new = '    2,\n    "generator action link attributes",'
    if text.count(count_old) != 1:
        raise SystemExit(
            f"Expected one generator action-link count marker, found {text.count(count_old)}"
        )
    text = text.replace(count_old, count_new, 1)

    old_type_patch = """types = replace_once(
    types,
    '''  notes?: string;
}''',
    '''  notes?: string;
  customClasses?: string;
}''',
    \"SandboxRecord custom classes\",
)"""

    new_type_patch = """types = replace_once(
    types,
    '''  contentRootId?: string;

  notes?: string;
}''',
    '''  contentRootId?: string;

  notes?: string;
  customClasses?: string;
}''',
    \"SandboxRecord custom classes\",
)"""

    if text.count(old_type_patch) != 1:
        raise SystemExit(
            f"Expected one SandboxRecord custom-class patch block, found {text.count(old_type_patch)}"
        )
    text = text.replace(old_type_patch, new_type_patch, 1)

    path.write_text(text, encoding="utf8")
    raise SystemExit(0)

if mode == "finish":
    path = Path("src/generator/generate.ts")
    text = path.read_text(encoding="utf8")
    old = '''    action = `<a
  class="project-command-action"
  href="${attr(url)}"${externalAttributes(url)}
  aria-label="${attr(child.nav_label || child.title || "Open linked item")}"
><span aria-hidden="true">›</span></a>`;'''
    new = '''    action = `<a
  class="project-command-action"
  href="${attr(url)}"${generatedLinkAttributes(
    child,
    url,
    plainTextLabel(child.nav_label || child.title) || "Open linked item",
    true,
  )}
><span aria-hidden="true">›</span></a>`;'''
    if text.count(old) != 1:
        raise SystemExit(f"Expected one split link action, found {text.count(old)}")
    path.write_text(text.replace(old, new, 1), encoding="utf8")
    raise SystemExit(0)

raise SystemExit("Usage: nine-fix-runtime-helper.py prepare|finish")
