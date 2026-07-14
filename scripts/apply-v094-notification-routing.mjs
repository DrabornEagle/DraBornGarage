import fs from 'node:fs';

const path = 'src/AppShell.tsx';
let content = fs.readFileSync(path, 'utf8');
const from = `    if (target) {\n      const allowedForApprentice = !isApprentice || target === 'home' || target === 'orders' || target === 'settings';`;
const to = `    if (target) {\n      if (target === 'receivables' && navigationTarget.targetSection === 'payment_reports' && isOwnerMechanic) {\n        setStaffPanelMode('mechanic');\n        setTab('receivables');\n        consumeNavigationTarget();\n        return;\n      }\n      const allowedForApprentice = !isApprentice || target === 'home' || target === 'orders' || target === 'settings';`;
if (!content.includes(from)) throw new Error('AppShell yönlendirme bloğu bulunamadı');
content = content.replace(from, to);
const depsFrom = `  }, [navigationTarget, consumeNavigationTarget, isApprentice, businessRestricted, isAdmin, workshop?.id, selectWorkshop]);`;
const depsTo = `  }, [navigationTarget, consumeNavigationTarget, isApprentice, businessRestricted, isAdmin, isOwnerMechanic, workshop?.id, selectWorkshop]);`;
if (!content.includes(depsFrom)) throw new Error('AppShell effect bağımlılıkları bulunamadı');
content = content.replace(depsFrom, depsTo);
fs.writeFileSync(path, content);
