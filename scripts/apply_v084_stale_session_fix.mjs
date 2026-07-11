import fs from 'node:fs';

const file = 'src/context/AuthContext.tsx';
let source = fs.readFileSync(file, 'utf8');

function replaceOnce(before, after) {
  const index = source.indexOf(before);
  if (index < 0) {
    if (source.includes(after)) return;
    throw new Error(`AuthContext target not found: ${before.slice(0, 180)}`);
  }
  if (source.indexOf(before, index + before.length) >= 0) throw new Error('AuthContext target is not unique');
  source = source.slice(0, index) + after + source.slice(index + before.length);
}

replaceOnce(
  `    const [{ data: profileData }, { data: memberData }, customerWorkshopResult, { data: applicationData }] = await Promise.all([`,
  `    const [{ data: profileData, error: profileError }, { data: memberData }, customerWorkshopResult, { data: applicationData }] = await Promise.all([`,
);
replaceOnce(
  `    const nextProfile = (profileData as Profile | null) ?? null;`,
  `    if (!profileError && !profileData) {\n      await supabase.auth.signOut({ scope: 'local' });\n      setSession(null);\n      clearState();\n      setLoading(false);\n      return;\n    }\n\n    const nextProfile = (profileData as Profile | null) ?? null;`,
);

fs.writeFileSync(file, source);
console.log('Deleted-account stale sessions now return to the login screen.');
