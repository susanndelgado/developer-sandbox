INSERT INTO categories (
  id,
  name,
  slug
) VALUES (
  'developer-tooling',
  'Developer Tooling',
  'developer-tooling'
);

INSERT INTO records (
  id,
  title,
  slug,
  type,
  status,
  visibility,
  featured
) VALUES (
  'sandbox-datastore',
  'Sandbox Datastore',
  'sandbox-datastore',
  'project',
  'active',
  'public',
  1
);

INSERT INTO technologies (
  id,
  name,
  type,
  slug
) VALUES (
  'typescript',
  'TypeScript',
  'language',
  'typescript'
);

INSERT INTO record_technologies (
  record_id,
  technology_id,
  role
) VALUES (
  'sandbox-datastore',
  'typescript',
  'primary'
);
